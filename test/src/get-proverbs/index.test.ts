import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { handler } from "../../../src/get-proverbs/index";

describe("get-proverbs handler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  beforeEach(() => {
    ddbMock.resetHistory();
    process.env.TABLE_NAME = "TestTable";
  });

  it("queries daily proverbs, defaults to newest first", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { pk: "daily-proverb", sk: "2026-01-02", ref: "Proverbs10:2" },
        { pk: "daily-proverb", sk: "2026-01-01", ref: "Proverbs10:1" },
      ],
    });

    const event = {} as unknown as APIGatewayProxyEvent;
    const result = await handler(event);
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.items).toHaveLength(2);
    expect(body.lastKey).toBeUndefined();

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.ScanIndexForward).toBe(false);
  });

  it("accepts scanForward=true query param", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });

    const event = {
      queryStringParameters: { scanForward: "true" },
    } as unknown as APIGatewayProxyEvent;
    await handler(event);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.ScanIndexForward).toBe(true);
  });

  it("handles pagination with lastKey", async () => {
    const lastEvaluatedKey = { pk: "daily-proverb", sk: "2025-06-01" };
    ddbMock.on(QueryCommand).resolves({
      Items: [{ pk: "daily-proverb", sk: "2025-06-01", ref: "Proverbs10:1" }],
      LastEvaluatedKey: lastEvaluatedKey,
    });

    const event = {} as unknown as APIGatewayProxyEvent;
    const result = await handler(event);
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.items).toHaveLength(1);
    expect(body.lastKey).toBe(
      Buffer.from(JSON.stringify(lastEvaluatedKey)).toString("base64"),
    );
  });

  it("passes lastKey from query param as ExclusiveStartKey", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });

    const exclusiveStartKey = { pk: "daily-proverb", sk: "2025-05-01" };
    const lastKey = Buffer.from(JSON.stringify(exclusiveStartKey)).toString(
      "base64",
    );

    const event = {
      queryStringParameters: { lastKey },
    } as unknown as APIGatewayProxyEvent;
    await handler(event);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.ExclusiveStartKey).toEqual(exclusiveStartKey);
  });

  it("passes limit from query param", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });

    const event = {
      queryStringParameters: { limit: "5" },
    } as unknown as APIGatewayProxyEvent;
    await handler(event);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(queryCall.Limit).toBe(5);
  });
});
