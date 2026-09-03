import type { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../../../src/server-widget-handler/index";

jest.mock("../../../src/server-widget-handler/getWidgetHandler", () => ({
  getWidgetHandler: jest.fn(),
}));

import { getWidgetHandler } from "../../../src/server-widget-handler/getWidgetHandler";

const mockGetHandler = getWidgetHandler as jest.Mock;

describe("server-widget-handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes query string parameters through to the fetch request", async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    mockGetHandler.mockReturnValue(async () => mockResponse);

    const event = {
      httpMethod: "GET",
      path: "/widgets/render",
      queryStringParameters: {
        widgetId: "proverb_widget",
        platform: "android",
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body!)).toEqual({ ok: true });
    expect(result.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("handles events with no query string parameters", async () => {
    const mockResponse = new Response(JSON.stringify({ empty: true }), {
      status: 200,
    });
    mockGetHandler.mockReturnValue(async () => mockResponse);

    const event = {
      httpMethod: "GET",
      path: "/widgets/render",
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body!)).toEqual({ empty: true });
    expect(mockGetHandler).toHaveBeenCalledTimes(1);
  });

  it("passes headers through to the fetch request", async () => {
    let capturedRequest: Request | undefined;
    mockGetHandler.mockReturnValue(async (req: Request) => {
      capturedRequest = req;
      return new Response("{}", { status: 200 });
    });

    const event = {
      httpMethod: "GET",
      path: "/widgets/render",
      headers: {
        "x-bible-version": "kjv",
        authorization: "Bearer test-token",
      },
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    const req = capturedRequest!;
    expect(req.headers.get("x-bible-version")).toBe("kjv");
    expect(req.headers.get("authorization")).toBe("Bearer test-token");
  });

  it("returns the status code from the voltra handler", async () => {
    const mockResponse = new Response("", { status: 401 });
    mockGetHandler.mockReturnValue(async () => mockResponse);

    const event = {
      httpMethod: "GET",
      path: "/widgets/render",
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(result.body).toBe("");
  });
});
