import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { getAccountDetailsHandler } from "../../../../src/account-handler/getAccountDetails/index";
import type { AccountHandlerEnv } from "../../../../src/account-handler/models";

describe("getAccountDetailsHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env: AccountHandlerEnv = { TABLE_NAME: "TestTable" };

  beforeEach(() => {
    ddbMock.resetHistory();
  });

  it("returns the account record when found", async () => {
    const mockItem = {
      pk: "user-123",
      sk: "account",
      accountCreatedDate: "2026-05-29T12:00:00.000Z",
      totalMeditations: 0,
      totalNotes: 0,
    };

    ddbMock
      .on(GetCommand, {
        TableName: "TestTable",
        Key: { pk: "user-123", sk: "account" },
      })
      .resolves({ Item: mockItem });

    const event = {
      pathParameters: { uuid: "user-123" },
    } as unknown as APIGatewayProxyEvent;

    const result = await getAccountDetailsHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(mockItem);
  });

  it("returns 404 when account is not found", async () => {
    ddbMock
      .on(GetCommand, {
        TableName: "TestTable",
        Key: { pk: "user-456", sk: "account" },
      })
      .resolves({ Item: undefined });

    const event = {
      pathParameters: { uuid: "user-456" },
    } as unknown as APIGatewayProxyEvent;

    const result = await getAccountDetailsHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      error: "Account not found",
    });
  });

  it("returns 400 when uuid is missing", async () => {
    const event = {
      pathParameters: {},
    } as unknown as APIGatewayProxyEvent;

    const result = await getAccountDetailsHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: "uuid path parameter is required",
    });
  });

  it("returns 400 when pathParameters is undefined", async () => {
    const event = {} as unknown as APIGatewayProxyEvent;

    const result = await getAccountDetailsHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: "uuid path parameter is required",
    });
  });

  it("returns 500 when DynamoDB throws an error", async () => {
    ddbMock.on(GetCommand).rejects(new Error("DynamoDB failure"));

    const event = {
      pathParameters: { uuid: "user-123" },
    } as unknown as APIGatewayProxyEvent;

    const result = await getAccountDetailsHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: "Internal server error",
    });
  });
});
