import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { getProverbNotesHandler } from "../../../../src/note-handler/getProverbNotes/index";

const createDocClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}));

describe("getProverbNotesHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env = { TABLE_NAME: "TestTable" };

  beforeEach(() => {
    ddbMock.reset();
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

  it("returns 500 on DynamoDB error", async () => {
    ddbMock.on(QueryCommand).rejects(new Error("DynamoDB failure"));

    const event = {
      pathParameters: { ref: "Proverbs3:5" },
    } as unknown as APIGatewayProxyEvent;

    const result = await getProverbNotesHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(500);
  });
});
