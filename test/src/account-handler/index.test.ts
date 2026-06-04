import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../../../src/account-handler/index";

jest.mock("../../../src/account-handler/getAccountDetails/index", () => ({
  getAccountDetailsHandler: jest.fn().mockResolvedValue({
    statusCode: 200,
    body: JSON.stringify({
      pk: "user-123",
      sk: "account",
      accountCreatedDate: "2026-05-29T12:00:00.000Z",
      totalMeditations: 0,
      totalNotes: 0,
    }),
  }),
}));

jest.mock("../../../src/account-handler/createAccount/index", () => ({
  createAccountHandler: jest.fn().mockResolvedValue({
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  }),
}));

import { getAccountDetailsHandler } from "../../../src/account-handler/getAccountDetails/index";
import { createAccountHandler } from "../../../src/account-handler/createAccount/index";

describe("account-handler router", () => {
  beforeEach(() => {
    process.env.TABLE_NAME = "TestTable";
    jest.clearAllMocks();
  });

  it("routes GET /accounts/{uuid} to getAccountDetailsHandler", async () => {
    const event = {
      httpMethod: "GET",
      resource: "/accounts/{uuid}",
      pathParameters: { uuid: "user-123" },
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    expect(getAccountDetailsHandler).toHaveBeenCalled();
  });

  it("routes POST /accounts/{uuid}/create to createAccountHandler", async () => {
    const event = {
      httpMethod: "POST",
      resource: "/accounts/{uuid}/create",
      pathParameters: { uuid: "user-123" },
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    expect(createAccountHandler).toHaveBeenCalled();
  });

  it("returns 405 for unsupported routes", async () => {
    const event = {
      httpMethod: "DELETE",
      resource: "/accounts/{uuid}",
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(405);
    expect(JSON.parse(result.body)).toEqual({ error: "Method not allowed" });
  });

  it("returns 500 when env var is missing", async () => {
    delete process.env.TABLE_NAME;

    const event = {
      httpMethod: "GET",
      resource: "/accounts/{uuid}",
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
  });
});