import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { createAccountHandler } from "../../../../src/account-handler/createAccount/index";
import type { AccountHandlerEnv } from "../../../../src/account-handler/models";

describe("createAccountHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env: AccountHandlerEnv = { TABLE_NAME: "TestTable" };

  beforeEach(() => {
    ddbMock.resetHistory();
  });

  it("creates an account record and returns success", async () => {
    ddbMock.on(GetCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});

    const event = {
      pathParameters: { uuid: "user-123" },
    } as unknown as APIGatewayProxyEvent;

    const result = await createAccountHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ success: true });

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);
    const item = putCalls[0].args[0].input.Item;
    expect(item).toMatchObject({
      pk: "user-123",
      sk: "account",
      totalMeditations: 0,
      totalNotes: 0,
    });
    expect(typeof item!.accountCreatedDate).toBe("string");
  });

  it("does nothing when account record already exists", async () => {
    ddbMock
      .on(GetCommand)
      .resolves({ Item: { pk: "user-123", sk: "account" } });

    const event = {
      pathParameters: { uuid: "user-123" },
    } as unknown as APIGatewayProxyEvent;

    const result = await createAccountHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ success: true });

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(0);
  });

  it("returns 400 when uuid is missing", async () => {
    const event = {
      pathParameters: {},
    } as unknown as APIGatewayProxyEvent;

    const result = await createAccountHandler(
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

    const result = await createAccountHandler(
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
    ddbMock.on(GetCommand).resolves({});
    ddbMock.on(PutCommand).rejects(new Error("DynamoDB failure"));

    const event = {
      pathParameters: { uuid: "user-123" },
    } as unknown as APIGatewayProxyEvent;

    const result = await createAccountHandler(
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