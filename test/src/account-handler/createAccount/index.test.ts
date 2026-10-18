import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { createAccountHandler } from "../../../../src/account-handler/createAccount/index";
import type { AccountHandlerEnv } from "../../../../src/account-handler/models";
import { authenticatedEvent } from "../../../helpers/authenticatedEvent";

describe("createAccountHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env: AccountHandlerEnv = {
    TABLE_NAME: "TestTable",
    USER_POOL_ID: "test-pool-id",
  };

  beforeEach(() => {
    ddbMock.resetHistory();
  });

  it("creates an account record with displayName and returns success", async () => {
    ddbMock.on(GetCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});

    const event = authenticatedEvent("user-123", {
      pathParameters: { uuid: "user-123" },
      body: JSON.stringify({ displayName: "Alice" }),
    });

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
      displayName: "Alice",
    });
    expect(typeof item!.accountCreatedDate).toBe("string");
  });

  it("returns 401 when the request is unauthenticated", async () => {
    const event = {
      pathParameters: { uuid: "user-123" },
      body: JSON.stringify({ displayName: "Alice" }),
    } as unknown as Parameters<typeof createAccountHandler>[2];

    const result = await createAccountHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(401);
  });

  it("returns 403 when the path uuid belongs to another user", async () => {
    const event = authenticatedEvent("user-123", {
      pathParameters: { uuid: "user-456" },
      body: JSON.stringify({ displayName: "Alice" }),
    });

    const result = await createAccountHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(403);
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
  });

  it("does nothing when account record already exists", async () => {
    ddbMock
      .on(GetCommand)
      .resolves({ Item: { pk: "user-123", sk: "account" } });

    const event = authenticatedEvent("user-123", {
      pathParameters: { uuid: "user-123" },
      body: JSON.stringify({ displayName: "Alice" }),
    });

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

  it("returns 500 when DynamoDB throws an error", async () => {
    ddbMock.on(GetCommand).resolves({});
    ddbMock.on(PutCommand).rejects(new Error("DynamoDB failure"));

    const event = authenticatedEvent("user-123", {
      pathParameters: { uuid: "user-123" },
      body: JSON.stringify({ displayName: "Alice" }),
    });

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
