import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { getUserNotesHandler } from "../../../../src/note-handler/getUserNotes/index";
import { authenticatedEvent } from "../../../helpers/authenticatedEvent";

const createDocClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}));

const UUID = "66a20224-c0d1-70f3-58f9-4671e44cac10";

describe("getUserNotesHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env = { TABLE_NAME: "TestTable", FCM_SECRET_NAME: "test-fcm-secret" };

  beforeEach(() => {
    ddbMock.reset();
    ddbMock.on(BatchGetCommand).resolves({ Responses: { TestTable: [] } });
  });

  it("queries user-notes-index by sub with ScanIndexForward defaulting to false", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = authenticatedEvent(UUID, {
      pathParameters: { uuid: UUID },
      queryStringParameters: {},
    });

    const result = await getUserNotesHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(200);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.IndexName).toBe("user-notes-index");
    expect(queryCall.KeyConditionExpression).toBe("#uid = :uid");
    expect(queryCall.ExpressionAttributeNames).toEqual({ "#uid": "uuid" });
    expect(queryCall.ExpressionAttributeValues![":uid"]).toBe(UUID);
    expect(queryCall.ScanIndexForward).toBe(false);
  });

  it("returns 401 when the request is unauthenticated", async () => {
    const event = {
      pathParameters: { uuid: UUID },
    } as unknown as Parameters<typeof getUserNotesHandler>[2];

    const result = await getUserNotesHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(401);
  });

  it("returns 403 when the path uuid belongs to another user", async () => {
    const event = authenticatedEvent(UUID, {
      pathParameters: { uuid: "someone-else" },
    });

    const result = await getUserNotesHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(403);
    expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(0);
  });

  it("accepts scanForward=true query param", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = authenticatedEvent(UUID, {
      pathParameters: { uuid: UUID },
      queryStringParameters: { scanForward: "true" },
    });

    await getUserNotesHandler(createDocClient(), env, event);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.ScanIndexForward).toBe(true);
  });

  it("passes limit from query param", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = authenticatedEvent(UUID, {
      pathParameters: { uuid: UUID },
      queryStringParameters: { limit: "5" },
    });

    await getUserNotesHandler(createDocClient(), env, event);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.Limit).toBe(5);
  });

  it("passes lastKey from query param as ExclusiveStartKey", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const exclusiveStartKey = {
      uuid: UUID,
      dateCreated: "2024-01-01T00:00:00.000Z",
    };
    const lastKey = Buffer.from(JSON.stringify(exclusiveStartKey)).toString(
      "base64",
    );

    const event = authenticatedEvent(UUID, {
      pathParameters: { uuid: UUID },
      queryStringParameters: { lastKey },
    });

    await getUserNotesHandler(createDocClient(), env, event);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.ExclusiveStartKey).toEqual(exclusiveStartKey);
  });

  it("returns lastKey when LastEvaluatedKey is present", async () => {
    const lastEvaluatedKey = {
      uuid: UUID,
      dateCreated: "2024-01-01T00:00:00.000Z",
    };
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          pk: UUID,
          sk: "Proverbs1:1",
          note: "my note",
          dateCreated: "2024-01-01T00:00:00.000Z",
          date: "2024-01-01",
          uuid: UUID,
          ref: "Proverbs1:1",
        },
      ],
      LastEvaluatedKey: lastEvaluatedKey,
    });

    const event = authenticatedEvent(UUID, {
      pathParameters: { uuid: UUID },
    });

    const result = await getUserNotesHandler(createDocClient(), env, event);

    const body = JSON.parse(result.body);
    expect(body.lastKey).toBe(
      Buffer.from(JSON.stringify(lastEvaluatedKey)).toString("base64"),
    );
  });

  it("returns empty items array when no notes exist", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = authenticatedEvent(UUID, {
      pathParameters: { uuid: UUID },
    });

    const result = await getUserNotesHandler(createDocClient(), env, event);

    const body = JSON.parse(result.body);
    expect(body.items).toEqual([]);
    expect(body.lastKey).toBeUndefined();
  });

  it("returns 500 on DynamoDB error", async () => {
    ddbMock.on(QueryCommand).rejects(new Error("DynamoDB failure"));

    const event = authenticatedEvent(UUID, {
      pathParameters: { uuid: UUID },
    });

    const result = await getUserNotesHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(500);
  });
});
