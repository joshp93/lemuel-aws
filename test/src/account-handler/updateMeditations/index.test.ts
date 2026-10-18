import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import type { AccountHandlerEnv } from "../../../../src/account-handler/models";
import { updateMeditationsHandler } from "../../../../src/account-handler/updateMeditations/index";
import { authenticatedEvent } from "../../../helpers/authenticatedEvent";

describe("updateMeditationsHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env: AccountHandlerEnv = {
    TABLE_NAME: "TestTable",
    USER_POOL_ID: "test-pool-id",
  };

  beforeEach(() => {
    ddbMock.resetHistory();
  });

  it("creates a meditation, queries count, and updates the account", async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({ Count: 3 });
    ddbMock.on(UpdateCommand).resolves({});

    const event = authenticatedEvent("user-123", {
      pathParameters: { uuid: "user-123", date: "2026-02-01" },
    });

    const result = await updateMeditationsHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ success: true });

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].args[0].input.Item).toEqual({
      pk: "meditation#user-123",
      sk: "2026-02-01",
      uuid: "user-123",
      date: "2026-02-01",
    });

    const queryCalls = ddbMock.commandCalls(QueryCommand);
    expect(queryCalls).toHaveLength(1);
    expect(queryCalls[0].args[0].input.KeyConditionExpression).toBe("pk = :pk");
    expect(queryCalls[0].args[0].input.ExpressionAttributeValues).toEqual({
      ":pk": "meditation#user-123",
    });
    expect(queryCalls[0].args[0].input.Select).toBe("COUNT");

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].args[0].input.Key).toEqual({
      pk: "user-123",
      sk: "account",
    });
    expect(updateCalls[0].args[0].input.UpdateExpression).toBe(
      "SET totalMeditations = :count",
    );
    expect(updateCalls[0].args[0].input.ExpressionAttributeValues).toEqual({
      ":count": 3,
    });
  });

  it("returns 401 when the request is unauthenticated", async () => {
    const event = {
      pathParameters: { uuid: "user-123", date: "2026-02-01" },
    } as unknown as Parameters<typeof updateMeditationsHandler>[2];

    const result = await updateMeditationsHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(401);
  });

  it("returns 403 when the path uuid belongs to another user", async () => {
    const event = authenticatedEvent("user-123", {
      pathParameters: { uuid: "user-456", date: "2026-02-01" },
    });

    const result = await updateMeditationsHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(403);
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
  });

  it("sets count to 0 when Query returns undefined Count", async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({ Count: undefined });
    ddbMock.on(UpdateCommand).resolves({});

    const event = authenticatedEvent("user-123", {
      pathParameters: { uuid: "user-123", date: "2026-02-02" },
    });

    const result = await updateMeditationsHandler(
      DynamoDBDocumentClient.from(new DynamoDBClient({})),
      env,
      event,
    );

    expect(result.statusCode).toBe(200);

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls[0].args[0].input.ExpressionAttributeValues).toEqual({
      ":count": 0,
    });
  });

  it("returns 500 when DynamoDB throws an error", async () => {
    ddbMock.on(PutCommand).rejects(new Error("DynamoDB failure"));

    const event = authenticatedEvent("user-123", {
      pathParameters: { uuid: "user-123", date: "2026-02-01" },
    });

    const result = await updateMeditationsHandler(
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
