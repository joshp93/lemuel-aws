import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { handler } from "../../../src/create-device-notif-config/index";

describe("create-device-notif-config handler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.resetHistory();
    process.env.TABLE_NAME = "TestTable";
  });

  const makeEvent = (body: unknown) => ({
    body: JSON.stringify(body),
  });

  it("registers a device with notifications enabled", async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.resetHistory();

    const event = makeEvent({
      token: "test-fcm-token-123",
      platform: "android",
      notificationsEnabled: "true",
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ success: true });

    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls).toHaveLength(1);

    const item = calls[0].args[0].input.Item as Record<string, unknown>;
    expect(item.pk).toBe("device-notif-config");
    expect(item.token).toBe("test-fcm-token-123");
    expect(item.platform).toBe("android");
    expect(item.notificationsEnabled).toBe("true");
    expect(typeof item.sk).toBe("string");
    expect((item.sk as string).length).toBe(64); // sha256 hex
  });

  it("registers a device with notifications disabled", async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.resetHistory();

    const event = makeEvent({
      token: "disabled-token",
      platform: "android",
      notificationsEnabled: "false",
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    const calls = ddbMock.commandCalls(PutCommand);
    const item = calls[0].args[0].input.Item as Record<string, unknown>;
    expect(item.notificationsEnabled).toBe("false");
  });

  it("throws when token is missing", async () => {
    const event = makeEvent({
      platform: "android",
      notificationsEnabled: "true",
    });

    await expect(handler(event)).rejects.toThrow();
  });

  it("throws when body is missing", async () => {
    const event = {};

    await expect(handler(event)).rejects.toThrow();
  });

  it("generates sha256 hash as sk", async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.resetHistory();

    const event1 = makeEvent({
      token: "same-token",
      platform: "android",
      notificationsEnabled: "true",
    });

    await handler(event1);

    const event2 = makeEvent({
      token: "same-token",
      platform: "android",
      notificationsEnabled: "false",
    });

    await handler(event2);

    const calls = ddbMock.commandCalls(PutCommand);
    const sk1 = (calls[0].args[0].input.Item as Record<string, unknown>).sk;
    const sk2 = (calls[1].args[0].input.Item as Record<string, unknown>).sk;

    expect(sk1).toBe(sk2);
  });
});
