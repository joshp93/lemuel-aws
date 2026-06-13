import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { getUserNotesHandler } from "../../../../src/note-handler/getUserNotes/index";

const createDocClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}));

describe("getUserNotesHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env = { TABLE_NAME: "TestTable" };

  beforeEach(() => {
    ddbMock.reset();
  });

  it("queries user-notes-index by uuid with ScanIndexForward defaulting to false", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = {
      pathParameters: { uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10" },
      queryStringParameters: {},
    } as unknown as APIGatewayProxyEvent;

    const result = await getUserNotesHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(200);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.IndexName).toBe("user-notes-index");
    expect(queryCall.KeyConditionExpression).toBe("#uid = :uid");
    expect(queryCall.ExpressionAttributeNames).toEqual({ "#uid": "uuid" });
    expect(queryCall.ExpressionAttributeValues![":uid"]).toBe(
      "66a20224-c0d1-70f3-58f9-4671e44cac10",
    );
    expect(queryCall.ScanIndexForward).toBe(false);
  });

  it("accepts scanForward=true query param", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = {
      pathParameters: { uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10" },
      queryStringParameters: { scanForward: "true" },
    } as unknown as APIGatewayProxyEvent;

    await getUserNotesHandler(createDocClient(), env, event);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.ScanIndexForward).toBe(true);
  });

  it("passes limit from query param", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = {
      pathParameters: { uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10" },
      queryStringParameters: { limit: "5" },
    } as unknown as APIGatewayProxyEvent;

    await getUserNotesHandler(createDocClient(), env, event);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.Limit).toBe(5);
  });

  it("passes lastKey from query param as ExclusiveStartKey", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const exclusiveStartKey = {
      uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
      dateCreated: "2024-01-01T00:00:00.000Z",
    };
    const lastKey = Buffer.from(JSON.stringify(exclusiveStartKey)).toString(
      "base64",
    );

    const event = {
      pathParameters: { uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10" },
      queryStringParameters: { lastKey },
    } as unknown as APIGatewayProxyEvent;

    await getUserNotesHandler(createDocClient(), env, event);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.ExclusiveStartKey).toEqual(exclusiveStartKey);
  });

  it("returns lastKey when LastEvaluatedKey is present", async () => {
    const lastEvaluatedKey = {
      uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
      dateCreated: "2024-01-01T00:00:00.000Z",
    };
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          pk: "66a20224-c0d1-70f3-58f9-4671e44cac10",
          sk: "Proverbs1:1",
          note: "my note",
          dateCreated: "2024-01-01T00:00:00.000Z",
          uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
          ref: "Proverbs1:1",
        },
      ],
      LastEvaluatedKey: lastEvaluatedKey,
    });

    const event = {
      pathParameters: { uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10" },
    } as unknown as APIGatewayProxyEvent;

    const result = await getUserNotesHandler(createDocClient(), env, event);

    const body = JSON.parse(result.body);
    expect(body.lastKey).toBe(
      Buffer.from(JSON.stringify(lastEvaluatedKey)).toString("base64"),
    );
  });

  it("returns empty items array when no notes exist", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = {
      pathParameters: { uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10" },
    } as unknown as APIGatewayProxyEvent;

    const result = await getUserNotesHandler(createDocClient(), env, event);

    const body = JSON.parse(result.body);
    expect(body.items).toEqual([]);
    expect(body.lastKey).toBeUndefined();
  });

  it("returns 500 on DynamoDB error", async () => {
    ddbMock.on(QueryCommand).rejects(new Error("DynamoDB failure"));

    const event = {
      pathParameters: { uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10" },
    } as unknown as APIGatewayProxyEvent;

    const result = await getUserNotesHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(500);
  });
});
