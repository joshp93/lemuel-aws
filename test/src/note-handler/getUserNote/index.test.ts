import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { getUserNoteHandler } from "../../../../src/note-handler/getUserNote/index";
import { authenticatedEvent } from "../../../helpers/authenticatedEvent";

const createDocClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}));

describe("getUserNoteHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env = { TABLE_NAME: "TestTable", FCM_SECRET_NAME: "test-fcm-secret" };

  beforeEach(() => {
    ddbMock.reset();
  });

  it("returns the note when found", async () => {
    const mockItem = {
      pk: "66a20224-c0d1-70f3-58f9-4671e44cac10",
      sk: "Proverbs1:1",
      note: "my note",
      dateCreated: "2024-01-01T00:00:00.000Z",
      date: "2024-01-01",
      uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
      ref: "Proverbs1:1",
      isPrivate: false,
      reactionCounts: {},
      replyCount: 0,
    };
    ddbMock.on(GetCommand).resolves({ Item: mockItem });

    const event = authenticatedEvent("66a20224-c0d1-70f3-58f9-4671e44cac10", {
      pathParameters: {
        uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
        ref: "Proverbs1:1",
      },
    });

    const result = await getUserNoteHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ ...mockItem, displayName: "" });
  });

  it("returns 401 when the request is unauthenticated", async () => {
    const event = {
      pathParameters: {
        uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
        ref: "Proverbs1:1",
      },
    } as unknown as Parameters<typeof getUserNoteHandler>[2];

    const result = await getUserNoteHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(401);
  });

  it("returns 403 when the path uuid belongs to another user", async () => {
    const event = authenticatedEvent("user-1", {
      pathParameters: { uuid: "user-2", ref: "Proverbs1:1" },
    });

    const result = await getUserNoteHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(403);
    expect(ddbMock.commandCalls(GetCommand)).toHaveLength(0);
  });

  it("returns 404 when note is not found", async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const event = authenticatedEvent("66a20224-c0d1-70f3-58f9-4671e44cac10", {
      pathParameters: {
        uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
        ref: "Proverbs1:1",
      },
    });

    const result = await getUserNoteHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({ error: "Note not found" });
  });

  it("returns 500 on DynamoDB error", async () => {
    ddbMock.on(GetCommand).rejects(new Error("DynamoDB failure"));

    const event = authenticatedEvent("66a20224-c0d1-70f3-58f9-4671e44cac10", {
      pathParameters: {
        uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
        ref: "Proverbs1:1",
      },
    });

    const result = await getUserNoteHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(500);
  });
});
