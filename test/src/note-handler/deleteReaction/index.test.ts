import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { deleteReactionHandler } from "../../../../src/note-handler/deleteReaction/index";

const createDocClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}));

describe("deleteReactionHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env = { TABLE_NAME: "TestTable" };

  beforeEach(() => {
    ddbMock.reset();
  });

  const makeEvent = (): APIGatewayProxyEvent =>
    ({
      pathParameters: {
        uuid: "author-id",
        ref: "Proverbs3:5",
      },
      queryStringParameters: { date: "2024-01-01" },
      requestContext: {
        authorizer: {
          claims: { sub: "user-1" },
        },
      },
    }) as unknown as APIGatewayProxyEvent;

  it("deletes reaction and decrements count using expression attribute names", async () => {
    ddbMock
      .on(GetCommand)
      .resolvesOnce({ Item: { reactionType: "🙏" } })
      .resolvesOnce({ Item: { reactionCounts: { "🙏": 3, "❤️": 1 } } });

    const result = await deleteReactionHandler(
      createDocClient(),
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(200);

    const deleteCalls = ddbMock.commandCalls(DeleteCommand);
    expect(deleteCalls).toHaveLength(2);

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].args[0].input.UpdateExpression).toBe(
      "SET reactionCounts.#e = reactionCounts.#e + :decr",
    );
    expect(updateCalls[0].args[0].input.ExpressionAttributeNames).toEqual({
      "#e": "🙏",
    });
  });

  it("replaces reactionCounts map when last emoji is removed", async () => {
    ddbMock
      .on(GetCommand)
      .resolvesOnce({ Item: { reactionType: "🙏" } })
      .resolvesOnce({ Item: { reactionCounts: { "🙏": 1 } } });

    const result = await deleteReactionHandler(
      createDocClient(),
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(200);

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].args[0].input.UpdateExpression).toBe(
      "SET reactionCounts = :map",
    );
    expect(updateCalls[0].args[0].input.ExpressionAttributeValues).toEqual({
      ":map": {},
    });
  });

  it("is a no-op when reaction does not exist", async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await deleteReactionHandler(
      createDocClient(),
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(200);
    expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(0);
  });

  it("returns 400 when userId or date is missing", async () => {
    const event = {
      pathParameters: { uuid: "author-id", ref: "Proverbs3:5" },
      queryStringParameters: {},
      requestContext: { authorizer: { claims: {} } },
    } as unknown as APIGatewayProxyEvent;

    const result = await deleteReactionHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(400);
  });

  it("returns 500 on error", async () => {
    ddbMock.on(GetCommand).rejects(new Error("DynamoDB failure"));

    const result = await deleteReactionHandler(
      createDocClient(),
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(500);
  });
});
