import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { linkDeviceTokenHandler } from "../../../../src/account-handler/linkDeviceToken/index";

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
    const event = {
      pathParameters: { uuid: "user-1" },
      body: JSON.stringify({ deviceToken: "test-token" }),
    } as unknown as APIGatewayProxyEvent;

    const result = await linkDeviceTokenHandler(fakeClient, env, event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ success: true });
  });

  it("returns 500 when deviceToken is missing (parseBody throws)", async () => {
    const event = {
      pathParameters: { uuid: "user-1" },
      body: JSON.stringify({}),
    } as unknown as APIGatewayProxyEvent;

    const result = await linkDeviceTokenHandler(fakeClient, env, event);

    expect(result.statusCode).toBe(500);
  });

  it("returns 500 when body is empty (parseBody throws)", async () => {
    const event = {
      pathParameters: { uuid: "user-1" },
      body: "",
    } as unknown as APIGatewayProxyEvent;

    const result = await linkDeviceTokenHandler(fakeClient, env, event);

    expect(result.statusCode).toBe(500);
  });

  it("returns 500 on error", async () => {
    const event = {
      pathParameters: { uuid: "user-1" },
      body: JSON.stringify({ deviceToken: "test-token" }),
    } as unknown as APIGatewayProxyEvent;

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
