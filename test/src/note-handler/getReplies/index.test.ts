import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { getRepliesHandler } from "../../../../src/note-handler/getReplies/index";

const createDocClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}));

describe("getRepliesHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env = { TABLE_NAME: "TestTable", FCM_SECRET_NAME: "test-fcm-secret" };

  beforeEach(() => {
    ddbMock.reset();
  });

  const replyItems = [
    {
      pk: "note#author-id#Proverbs3:5#2024-01-01",
      sk: "reply#2024-01-01T12:00:00.000Z",
      content: "Great reflection!",
      authorUuid: "user-1",
      displayName: "Alice",
      createdAt: "2024-01-01T12:00:00.000Z",
    },
    {
      pk: "note#author-id#Proverbs3:5#2024-01-01",
      sk: "reply#2024-01-01T13:00:00.000Z",
      content: "Amen!",
      authorUuid: "user-2",
      displayName: "Bob",
      createdAt: "2024-01-01T13:00:00.000Z",
    },
  ];

  const makeEvent = (lastKey?: string): APIGatewayProxyEvent =>
    ({
      pathParameters: {
        uuid: "author-id",
        ref: "Proverbs3:5",
      },
      queryStringParameters: {
        date: "2024-01-01",
        ...(lastKey ? { lastKey } : {}),
      },
    }) as unknown as APIGatewayProxyEvent;

  it("returns paginated replies", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: replyItems });

    const result = await getRepliesHandler(createDocClient(), env, makeEvent());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.items).toHaveLength(2);
    expect(body.items[0].content).toBe("Great reflection!");
    expect(body.items[1].content).toBe("Amen!");
    expect(body.lastKey).toBeUndefined();
  });

  it("returns empty items when no replies exist", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const result = await getRepliesHandler(createDocClient(), env, makeEvent());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.items).toEqual([]);
  });

  it("returns lastKey when there are more results", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: replyItems,
      LastEvaluatedKey: {
        pk: "note#author-id#Proverbs3:5#2024-01-01",
        sk: "reply#2024-01-01T13:00:00.000Z",
      },
    });

    const result = await getRepliesHandler(createDocClient(), env, makeEvent());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.lastKey).toBeDefined();
  });

  it("uses lastKey for pagination", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [replyItems[1]] });

    const lastKey = Buffer.from(
      JSON.stringify({
        pk: "note#author-id#Proverbs3:5#2024-01-01",
        sk: "reply#2024-01-01T12:00:00.000Z",
      }),
    ).toString("base64");

    const result = await getRepliesHandler(
      createDocClient(),
      env,
      makeEvent(lastKey),
    );

    expect(result.statusCode).toBe(200);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.ExclusiveStartKey).toBeDefined();
  });

  it("returns 500 on error", async () => {
    ddbMock.on(QueryCommand).rejects(new Error("DynamoDB failure"));

    const result = await getRepliesHandler(createDocClient(), env, makeEvent());

    expect(result.statusCode).toBe(500);
  });
});
