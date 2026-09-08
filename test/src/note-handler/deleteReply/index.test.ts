import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { deleteReplyHandler } from "../../../../src/note-handler/deleteReply/index";

const createDocClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}));

describe("deleteReplyHandler", () => {
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
      queryStringParameters: {
        date: "2024-01-01",
        replySk: "reply#2024-01-01T12:00:00.000Z",
      },
      requestContext: {
        authorizer: {
          claims: { sub: "user-1" },
        },
      },
    }) as unknown as APIGatewayProxyEvent;

  it("deletes reply and decrements replyCount", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        authorUuid: "user-1",
        pk: "note#author-id#Proverbs3:5#2024-01-01",
        sk: "reply#2024-01-01T12:00:00.000Z",
      },
    });

    const result = await deleteReplyHandler(
      createDocClient(),
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(200);

    const deleteCalls = ddbMock.commandCalls(DeleteCommand);
    expect(deleteCalls).toHaveLength(2);
    expect(deleteCalls[0].args[0].input.Key).toEqual({
      pk: "note#author-id#Proverbs3:5#2024-01-01",
      sk: "reply#2024-01-01T12:00:00.000Z",
    });

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].args[0].input.UpdateExpression).toBe(
      "ADD replyCount :decr",
    );
  });

  it("returns 403 when non-author tries to delete", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        authorUuid: "user-2",
        pk: "note#author-id#Proverbs3:5#2024-01-01",
        sk: "reply#2024-01-01T12:00:00.000Z",
      },
    });

    const result = await deleteReplyHandler(
      createDocClient(),
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(403);
    expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(0);
  });

  it("returns 404 when reply not found", async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await deleteReplyHandler(
      createDocClient(),
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(404);
  });

  it("returns 400 when required params are missing", async () => {
    const event = {
      pathParameters: { uuid: "author-id", ref: "Proverbs3:5" },
      queryStringParameters: {},
      requestContext: { authorizer: { claims: {} } },
    } as unknown as APIGatewayProxyEvent;

    const result = await deleteReplyHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(400);
  });

  it("returns 500 on error", async () => {
    ddbMock.on(GetCommand).rejects(new Error("DynamoDB failure"));

    const result = await deleteReplyHandler(
      createDocClient(),
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(500);
  });
});
