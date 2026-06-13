import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { postUserNoteHandler } from "../../../../src/note-handler/postUserNote/index";

const createDocClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}));

describe("postUserNoteHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env = { TABLE_NAME: "TestTable" };

  beforeEach(() => {
    ddbMock.reset();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("creates a note, counts notes, and updates account totalNotes", async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({ Count: 5 });
    ddbMock.on(UpdateCommand).resolves({});

    const event = {
      pathParameters: {
        uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
        ref: "Proverbs3:5",
      },
      body: JSON.stringify({ note: "Trust in the Lord" }),
    } as unknown as APIGatewayProxyEvent;

    const result = await postUserNoteHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toMatchObject({
      pk: "66a20224-c0d1-70f3-58f9-4671e44cac10",
      sk: "Proverbs3:5",
      note: "Trust in the Lord",
      uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
      ref: "Proverbs3:5",
      dateCreated: "2024-01-01T12:00:00.000Z",
    });

    const putCall = ddbMock.commandCalls(PutCommand)[0].args[0].input;
    expect(putCall.Item).toMatchObject({
      pk: "66a20224-c0d1-70f3-58f9-4671e44cac10",
      sk: "Proverbs3:5",
      note: "Trust in the Lord",
      uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
      ref: "Proverbs3:5",
      dateCreated: "2024-01-01T12:00:00.000Z",
    });

    const queryCalls = ddbMock.commandCalls(QueryCommand);
    expect(queryCalls).toHaveLength(1);
    expect(queryCalls[0].args[0].input.IndexName).toBe("user-notes-index");
    expect(queryCalls[0].args[0].input.KeyConditionExpression).toBe(
      "#uid = :uid",
    );
    expect(queryCalls[0].args[0].input.ExpressionAttributeNames).toEqual({
      "#uid": "uuid",
    });
    expect(queryCalls[0].args[0].input.ExpressionAttributeValues).toEqual({
      ":uid": "66a20224-c0d1-70f3-58f9-4671e44cac10",
    });
    expect(queryCalls[0].args[0].input.Select).toBe("COUNT");

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].args[0].input.Key).toEqual({
      pk: "66a20224-c0d1-70f3-58f9-4671e44cac10",
      sk: "account",
    });
    expect(updateCalls[0].args[0].input.UpdateExpression).toBe(
      "SET totalNotes = :count",
    );
    expect(updateCalls[0].args[0].input.ExpressionAttributeValues).toEqual({
      ":count": 5,
    });
  });

  it("returns 500 when body is empty", async () => {
    const event = {
      pathParameters: {
        uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
        ref: "Proverbs3:5",
      },
      body: "{}",
    } as unknown as APIGatewayProxyEvent;

    const result = await postUserNoteHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(500);
  });

  it("sets totalNotes to 0 when Query returns undefined Count", async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({ Count: undefined });
    ddbMock.on(UpdateCommand).resolves({});

    const event = {
      pathParameters: {
        uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
        ref: "Proverbs3:5",
      },
      body: JSON.stringify({ note: "Trust" }),
    } as unknown as APIGatewayProxyEvent;

    const result = await postUserNoteHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(200);

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls[0].args[0].input.ExpressionAttributeValues).toEqual({
      ":count": 0,
    });
  });

  it("returns 500 on DynamoDB PutCommand error", async () => {
    ddbMock.on(PutCommand).rejects(new Error("DynamoDB failure"));

    const event = {
      pathParameters: {
        uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
        ref: "Proverbs3:5",
      },
      body: JSON.stringify({ note: "my note" }),
    } as unknown as APIGatewayProxyEvent;

    const result = await postUserNoteHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(500);
  });
});
