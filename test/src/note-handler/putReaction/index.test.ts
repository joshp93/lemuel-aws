import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { putReactionHandler } from "../../../../src/note-handler/putReaction/index";

const createDocClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}));

describe("putReactionHandler", () => {
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

  const makeEvent = (
    overrides?: Partial<Record<string, unknown>>,
  ): APIGatewayProxyEvent =>
    ({
      pathParameters: {
        uuid: "author-id",
        ref: "Proverbs3:5",
      },
      body: JSON.stringify({ reactionType: "🙏", date: "2024-01-01" }),
      requestContext: {
        authorizer: {
          claims: { sub: "user-1" },
        },
      },
      ...overrides,
    }) as unknown as APIGatewayProxyEvent;

  it("creates a reaction and initialises counts when note has no reactionCounts yet", async () => {
    ddbMock
      .on(GetCommand)
      .resolvesOnce({ Item: undefined })
      .resolvesOnce({ Item: {} });

    const result = await putReactionHandler(
      createDocClient(),
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(200);

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(2);

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].args[0].input.UpdateExpression).toBe(
      "SET reactionCounts = :map",
    );
    expect(updateCalls[0].args[0].input.ExpressionAttributeValues).toEqual({
      ":map": { "🙏": 1 },
    });
  });

  it("returns 401 when userId is missing", async () => {
    const event = {
      pathParameters: { uuid: "author-id", ref: "Proverbs3:5" },
      body: JSON.stringify({ reactionType: "🙏", date: "2024-01-01" }),
      requestContext: { authorizer: { claims: {} } },
    } as unknown as APIGatewayProxyEvent;

    const result = await putReactionHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(401);
  });

  it("is a no-op when same reaction type already exists", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        pk: "note#author-id#Proverbs3:5#2024-01-01",
        sk: "reaction#user-1",
        reactionType: "🙏",
        reactorUuid: "user-1",
      },
    });

    const result = await putReactionHandler(
      createDocClient(),
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(200);
  });

  it("changes reaction and updates counts using expression attribute names", async () => {
    ddbMock
      .on(GetCommand)
      .resolvesOnce({
        Item: {
          pk: "note#author-id#Proverbs3:5#2024-01-01",
          sk: "reaction#user-1",
          reactionType: "👍",
          reactorUuid: "user-1",
        },
      })
      .resolvesOnce({
        Item: { reactionCounts: { "👍": 3, "❤️": 1 } },
      });

    const result = await putReactionHandler(
      createDocClient(),
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(200);

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(1);
    const expr = updateCalls[0].args[0].input.UpdateExpression;
    expect(expr).toContain("reactionCounts.#old");
    expect(expr).toContain("reactionCounts.#new");
    expect(updateCalls[0].args[0].input.ExpressionAttributeNames).toEqual({
      "#old": "👍",
      "#new": "🙏",
    });
  });

  it("returns 500 on error", async () => {
    ddbMock.on(GetCommand).rejects(new Error("DynamoDB failure"));

    const result = await putReactionHandler(
      createDocClient(),
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(500);
  });

  it("returns 500 on invalid reactionType", async () => {
    const event = makeEvent();
    (event as unknown as Record<string, unknown>).body = JSON.stringify({
      reactionType: "invalid",
      date: "2024-01-01",
    });

    const result = await putReactionHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(500);
  });
});
