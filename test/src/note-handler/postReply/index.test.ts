import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { postReplyHandler } from "../../../../src/note-handler/postReply/index";

const createDocClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}));

describe("postReplyHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env = { TABLE_NAME: "TestTable", FCM_SECRET_NAME: "test-fcm-secret" };

  beforeEach(() => {
    ddbMock.reset();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const makeEvent = (): APIGatewayProxyEvent =>
    ({
      pathParameters: {
        uuid: "author-id",
        ref: "Proverbs3:5",
      },
      body: JSON.stringify({
        content: "Great reflection!",
        date: "2024-01-01",
      }),
      requestContext: {
        authorizer: {
          claims: { sub: "user-1" },
        },
      },
    }) as unknown as APIGatewayProxyEvent;

  it("creates a reply and increments replyCount", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { pk: "user-1", sk: "account", displayName: "Alice" },
    });

    const result = await postReplyHandler(createDocClient(), env, makeEvent());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.content).toBe("Great reflection!");
    expect(body.authorUuid).toBe("user-1");
    expect(body.displayName).toBe("Alice");
    expect(body.createdAt).toBe("2024-01-01T12:00:00.000Z");

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(3);
    expect(putCalls[0].args[0].input.Item?.content).toBe("Great reflection!");
    expect(putCalls[2].args[0].input.Item?.pk).toBe("reply-notification");

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].args[0].input.UpdateExpression).toBe(
      "ADD replyCount :incr",
    );
  });

  it("returns 401 when userId is missing", async () => {
    const event = {
      pathParameters: { uuid: "author-id", ref: "Proverbs3:5" },
      body: JSON.stringify({ content: "test", date: "2024-01-01" }),
      requestContext: { authorizer: { claims: {} } },
    } as unknown as APIGatewayProxyEvent;

    const result = await postReplyHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(401);
  });

  it("returns 500 on error", async () => {
    ddbMock.on(GetCommand).rejects(new Error("DynamoDB failure"));

    const result = await postReplyHandler(createDocClient(), env, makeEvent());

    expect(result.statusCode).toBe(500);
  });
});
