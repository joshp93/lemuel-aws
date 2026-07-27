import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { handler } from "../../../src/migrate-user-uuids/index";

describe("migrate-user-uuids handler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
  });

  const env = { TABLE_NAME: "TestTable" };

  it("migrates account, notes, meditation, and display name for one user", async () => {
    process.env.TABLE_NAME = "TestTable";

    ddbMock.on(QueryCommand).callsFake((cmd) => {
      const pk =
        cmd.ExpressionAttributeValues?.[":pk"] ||
        cmd.input?.ExpressionAttributeValues?.[":pk"];
      if (pk === "old-uuid") {
        return {
          Items: [
            {
              pk: "old-uuid",
              sk: "account",
              totalMeditations: 5,
              totalNotes: 3,
              accountCreatedDate: "2024-01-01T00:00:00Z",
            },
            {
              pk: "old-uuid",
              sk: "Proverbs1:1",
              note: "hello",
              dateCreated: "2024-01-01T00:00:00Z",
              date: "2024-01-01",
              uuid: "old-uuid",
              ref: "Proverbs1:1",
              isPrivate: false,
            },
          ],
        };
      }
      if (pk === "meditation#old-uuid") {
        return {
          Items: [
            {
              pk: "meditation#old-uuid",
              sk: "2024-01-01",
              uuid: "old-uuid",
              date: "2024-01-01",
            },
            {
              pk: "meditation#old-uuid",
              sk: "2024-01-02",
              uuid: "old-uuid",
              date: "2024-01-02",
            },
          ],
        };
      }
      return { Items: [] };
    });

    ddbMock.on(GetCommand).callsFake((cmd) => {
      if ((cmd.input?.Key?.pk || cmd.Key?.pk) === "display-name#old-uuid") {
        return {
          Item: {
            pk: "display-name#old-uuid",
            sk: "display-name#old-uuid",
            displayName: "John",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        };
      }
      return {};
    });

    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(DeleteCommand).resolves({});

    const result = await handler({
      migrations: [{ oldUuid: "old-uuid", newUuid: "new-uuid" }],
    });

    expect(result.migrated).toBe(5);

    const putCalls = ddbMock.commandCalls(PutCommand);
    const putItems = putCalls.map((c) => c.args[0].input.Item);

    expect(putItems).toContainEqual(
      expect.objectContaining({ pk: "new-uuid", sk: "account" }),
    );
    expect(putItems).toContainEqual(
      expect.objectContaining({
        pk: "new-uuid",
        sk: "Proverbs1:1",
        uuid: "new-uuid",
      }),
    );
    expect(putItems).toContainEqual(
      expect.objectContaining({
        pk: "meditation#new-uuid",
        sk: "2024-01-01",
        uuid: "new-uuid",
      }),
    );
    expect(putItems).toContainEqual(
      expect.objectContaining({
        pk: "display-name#new-uuid",
        sk: "display-name#new-uuid",
        displayName: "John",
      }),
    );

    const deleteCalls = ddbMock.commandCalls(DeleteCommand);
    expect(deleteCalls).toHaveLength(5);
  });

  it("handles user with only account and notes (no meditations or display name)", async () => {
    process.env.TABLE_NAME = "TestTable";

    ddbMock.on(QueryCommand).callsFake((cmd) => {
      const pk =
        cmd.ExpressionAttributeValues?.[":pk"] ||
        cmd.input?.ExpressionAttributeValues?.[":pk"];
      if (pk === "old-uuid") {
        return {
          Items: [
            {
              pk: "old-uuid",
              sk: "account",
              totalMeditations: 0,
              totalNotes: 1,
              accountCreatedDate: "2024-01-01T00:00:00Z",
            },
            {
              pk: "old-uuid",
              sk: "Proverbs1:1",
              note: "hello",
              dateCreated: "2024-01-01T00:00:00Z",
              date: "2024-01-01",
              uuid: "old-uuid",
              ref: "Proverbs1:1",
              isPrivate: false,
            },
          ],
        };
      }
      return { Items: [] };
    });

    ddbMock.on(GetCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(DeleteCommand).resolves({});

    const result = await handler({
      migrations: [{ oldUuid: "old-uuid", newUuid: "new-uuid" }],
    });

    expect(result.migrated).toBe(2);
  });

  it("migrates multiple users", async () => {
    process.env.TABLE_NAME = "TestTable";

    ddbMock.on(QueryCommand).callsFake((cmd) => {
      const pk =
        cmd.ExpressionAttributeValues?.[":pk"] ||
        cmd.input?.ExpressionAttributeValues?.[":pk"];
      if (pk === "user1-old" || pk === "user2-old") {
        return {
          Items: [
            {
              pk,
              sk: "account",
              totalMeditations: 0,
              totalNotes: 0,
              accountCreatedDate: "2024-01-01T00:00:00Z",
            },
          ],
        };
      }
      return { Items: [] };
    });

    ddbMock.on(GetCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(DeleteCommand).resolves({});

    const result = await handler({
      migrations: [
        { oldUuid: "user1-old", newUuid: "user1-new" },
        { oldUuid: "user2-old", newUuid: "user2-new" },
      ],
    });

    expect(result.migrated).toBe(2);
  });

  it("handles empty items gracefully", async () => {
    process.env.TABLE_NAME = "TestTable";

    ddbMock.on(QueryCommand).resolves({ Items: [] });
    ddbMock.on(GetCommand).resolves({});

    const result = await handler({
      migrations: [{ oldUuid: "no-data-user", newUuid: "new-uuid" }],
    });

    expect(result.migrated).toBe(0);
  });

  it("rejects invalid event without migrations", async () => {
    await expect(handler({})).rejects.toThrow();
  });

  it("rejects event with empty migrations array", async () => {
    await expect(handler({ migrations: [] })).rejects.toThrow();
  });

  it("rejects event with missing oldUuid", async () => {
    await expect(
      handler({ migrations: [{ newUuid: "new" }] }),
    ).rejects.toThrow();
  });
});
