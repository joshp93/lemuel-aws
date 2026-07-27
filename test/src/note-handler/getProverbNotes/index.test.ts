import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { getProverbNotesHandler } from "../../../../src/note-handler/getProverbNotes/index";

const createDocClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}));

describe("getProverbNotesHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env = { TABLE_NAME: "TestTable" };

  beforeEach(() => {
    ddbMock.reset();
    ddbMock.on(BatchGetCommand).resolves({ Responses: { TestTable: [] } });
  });

  it("queries proverb-notes-index by ref with ScanIndexForward defaulting to false", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = {
      pathParameters: { ref: "Proverbs3:5" },
    } as unknown as APIGatewayProxyEvent;

    const result = await getProverbNotesHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(200);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.IndexName).toBe("proverb-notes-index");
    expect(queryCall.KeyConditionExpression).toBe("#reference = :reference");
    expect(queryCall.ExpressionAttributeNames!["#reference"]).toBe("ref");
    expect(queryCall.ExpressionAttributeValues![":reference"]).toBe(
      "Proverbs3:5",
    );
    expect(queryCall.ScanIndexForward).toBe(false);
  });

  it("accepts scanForward=true query param", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = {
      pathParameters: { ref: "Proverbs3:5" },
      queryStringParameters: { scanForward: "true" },
    } as unknown as APIGatewayProxyEvent;

    await getProverbNotesHandler(createDocClient(), env, event);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.ScanIndexForward).toBe(true);
  });

  it("passes limit from query param", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = {
      pathParameters: { ref: "Proverbs3:5" },
      queryStringParameters: { limit: "10" },
    } as unknown as APIGatewayProxyEvent;

    await getProverbNotesHandler(createDocClient(), env, event);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.Limit).toBe(10);
  });

  it("passes lastKey from query param as ExclusiveStartKey", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const exclusiveStartKey = {
      ref: "Proverbs3:5",
      dateCreated: "2024-01-01T00:00:00.000Z",
    };
    const lastKey = Buffer.from(JSON.stringify(exclusiveStartKey)).toString(
      "base64",
    );

    const event = {
      pathParameters: { ref: "Proverbs3:5" },
      queryStringParameters: { lastKey },
    } as unknown as APIGatewayProxyEvent;

    await getProverbNotesHandler(createDocClient(), env, event);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.ExclusiveStartKey).toEqual(exclusiveStartKey);
  });

  it("returns empty items array when no notes exist", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = {
      pathParameters: { ref: "Proverbs3:5" },
    } as unknown as APIGatewayProxyEvent;

    const result = await getProverbNotesHandler(createDocClient(), env, event);

    const body = JSON.parse(result.body);
    expect(body.items).toEqual([]);
    expect(body.lastKey).toBeUndefined();
  });

  it("filters out other users' private notes when no userId is provided", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          pk: "user1",
          sk: "Proverbs3:5",
          note: "Public note",
          dateCreated: "2024-01-01T12:00:00.000Z",
          date: "2024-01-01",
          uuid: "user1",
          ref: "Proverbs3:5",
          isPrivate: false,
        },
        {
          pk: "user2",
          sk: "Proverbs3:5",
          note: "Private note",
          dateCreated: "2024-01-01T12:00:00.000Z",
          date: "2024-01-01",
          uuid: "user2",
          ref: "Proverbs3:5",
          isPrivate: true,
        },
      ],
    });

    const event = {
      pathParameters: { ref: "Proverbs3:5" },
    } as unknown as APIGatewayProxyEvent;

    const result = await getProverbNotesHandler(createDocClient(), env, event);
    const body = JSON.parse(result.body);

    expect(body.items).toHaveLength(1);
    expect(body.items[0].note).toBe("Public note");
    expect(body.items[0].uuid).toBe("user1");
  });

  it("includes the author's own private notes when userId matches", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          pk: "user1",
          sk: "Proverbs3:5",
          note: "Public note",
          dateCreated: "2024-01-01T12:00:00.000Z",
          date: "2024-01-01",
          uuid: "user1",
          ref: "Proverbs3:5",
          isPrivate: false,
        },
        {
          pk: "user2",
          sk: "Proverbs3:5",
          note: "Author's private note",
          dateCreated: "2024-01-01T12:00:00.000Z",
          date: "2024-01-01",
          uuid: "user2",
          ref: "Proverbs3:5",
          isPrivate: true,
        },
        {
          pk: "user3",
          sk: "Proverbs3:5",
          note: "Other user's private note",
          dateCreated: "2024-01-01T12:00:00.000Z",
          date: "2024-01-01",
          uuid: "user3",
          ref: "Proverbs3:5",
          isPrivate: true,
        },
      ],
    });

    const event = {
      pathParameters: { ref: "Proverbs3:5" },
      queryStringParameters: { userId: "user2" },
    } as unknown as APIGatewayProxyEvent;

    const result = await getProverbNotesHandler(createDocClient(), env, event);
    const body = JSON.parse(result.body);

    expect(body.items).toHaveLength(2);
    expect(body.items[0].note).toBe("Public note");
    expect(body.items[1].note).toBe("Author's private note");
  });

  it("includes public notes where isPrivate is missing (backward compatibility)", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          pk: "user1",
          sk: "Proverbs3:5",
          note: "Legacy note",
          dateCreated: "2024-01-01T12:00:00.000Z",
          date: "2024-01-01",
          uuid: "user1",
          ref: "Proverbs3:5",
        },
      ],
    });

    const event = {
      pathParameters: { ref: "Proverbs3:5" },
    } as unknown as APIGatewayProxyEvent;

    const result = await getProverbNotesHandler(createDocClient(), env, event);
    const body = JSON.parse(result.body);

    expect(body.items).toHaveLength(1);
    expect(body.items[0].note).toBe("Legacy note");
  });

  it("returns 500 on DynamoDB error", async () => {
    ddbMock.on(QueryCommand).rejects(new Error("DynamoDB failure"));

    const event = {
      pathParameters: { ref: "Proverbs3:5" },
    } as unknown as APIGatewayProxyEvent;

    const result = await getProverbNotesHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(500);
  });
});
