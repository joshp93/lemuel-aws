import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { linkDeviceTokenHandler } from "../../../../src/account-handler/linkDeviceToken/index";
import { authenticatedEvent } from "../../../helpers/authenticatedEvent";

jest.mock("../../../../src/shared/deviceTokens", () => ({
  linkDeviceToken: jest.fn().mockResolvedValue(undefined),
}));

describe("linkDeviceTokenHandler", () => {
  const fakeClient = {} as DynamoDBDocumentClient;
  const env = { TABLE_NAME: "TestTable", USER_POOL_ID: "us-east-1_test" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("links device token and returns 200", async () => {
    const event = authenticatedEvent("user-1", {
      pathParameters: { uuid: "user-1" },
      body: JSON.stringify({ deviceToken: "test-token" }),
    });

    const result = await linkDeviceTokenHandler(fakeClient, env, event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ success: true });
  });

  it("returns 401 when the request is unauthenticated", async () => {
    const event = {
      pathParameters: { uuid: "user-1" },
      body: JSON.stringify({ deviceToken: "test-token" }),
    } as unknown as Parameters<typeof linkDeviceTokenHandler>[2];

    const result = await linkDeviceTokenHandler(fakeClient, env, event);

    expect(result.statusCode).toBe(401);
  });

  it("returns 403 when the path uuid belongs to another user", async () => {
    const event = authenticatedEvent("user-1", {
      pathParameters: { uuid: "user-2" },
      body: JSON.stringify({ deviceToken: "test-token" }),
    });

    const result = await linkDeviceTokenHandler(fakeClient, env, event);

    expect(result.statusCode).toBe(403);
  });

  it("returns 500 when deviceToken is missing (parseBody throws)", async () => {
    const event = authenticatedEvent("user-1", {
      pathParameters: { uuid: "user-1" },
      body: JSON.stringify({}),
    });

    const result = await linkDeviceTokenHandler(fakeClient, env, event);

    expect(result.statusCode).toBe(500);
  });

  it("returns 500 when body is empty (parseBody throws)", async () => {
    const event = authenticatedEvent("user-1", {
      pathParameters: { uuid: "user-1" },
      body: "",
    });

    const result = await linkDeviceTokenHandler(fakeClient, env, event);

    expect(result.statusCode).toBe(500);
  });

  it("returns 500 on error", async () => {
    const event = authenticatedEvent("user-1", {
      pathParameters: { uuid: "user-1" },
      body: JSON.stringify({ deviceToken: "test-token" }),
    });

    const { linkDeviceToken } = jest.requireMock(
      "../../../../src/shared/deviceTokens",
    );
    (linkDeviceToken as jest.Mock).mockRejectedValueOnce(
      new Error("DDB error"),
    );

    const result = await linkDeviceTokenHandler(fakeClient, env, event);

    expect(result.statusCode).toBe(500);
  });
});
