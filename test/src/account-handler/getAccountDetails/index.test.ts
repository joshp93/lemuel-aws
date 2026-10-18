import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { getAccountDetailsHandler } from "../../../../src/account-handler/getAccountDetails/index";
import type { AccountHandlerEnv } from "../../../../src/account-handler/models";
import { authenticatedEvent } from "../../../helpers/authenticatedEvent";

describe("getAccountDetailsHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env: AccountHandlerEnv = {
    TABLE_NAME: "TestTable",
    USER_POOL_ID: "test-pool-id",
  };

  beforeEach(() => {
    ddbMock.resetHistory();
  });

  it("returns the account record with displayName when found", async () => {
    const mockItem = {
      pk: "user-123",
      sk: "account",
      accountCreatedDate: "2026-05-29T12:00:00.000Z",
      totalMeditations: 0,
      totalNotes: 0,
      displayName: "Alice",
      replyNotificationsEnabled: true,
    };

    ddbMock
      .on(GetCommand, {
        TableName: "TestTable",
        Key: { pk: "user-123", sk: "account" },
      })
      .resolves({ Item: mockItem });

    const event = authenticatedEvent("user-123", {
      pathParameters: { uuid: "user-123" },
    });

    const result = await getAccountDetailsHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(mockItem);
  });

  it("returns 401 when the request is unauthenticated", async () => {
    const event = {
      pathParameters: { uuid: "user-123" },
    } as unknown as Parameters<typeof getAccountDetailsHandler>[2];

    const result = await getAccountDetailsHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(401);
  });

  it("returns 403 when the path uuid belongs to another user", async () => {
    const event = authenticatedEvent("user-123", {
      pathParameters: { uuid: "user-456" },
    });

    const result = await getAccountDetailsHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(403);
  });

  it("returns 404 when account is not found", async () => {
    ddbMock
      .on(GetCommand, {
        TableName: "TestTable",
        Key: { pk: "user-456", sk: "account" },
      })
      .resolves({ Item: undefined });

    const event = authenticatedEvent("user-456", {
      pathParameters: { uuid: "user-456" },
    });

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

  it("returns 500 when DynamoDB throws an error", async () => {
    ddbMock.on(GetCommand).rejects(new Error("DynamoDB failure"));

    const event = authenticatedEvent("user-123", {
      pathParameters: { uuid: "user-123" },
    });

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
