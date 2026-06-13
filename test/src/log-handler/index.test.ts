import type { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../../../src/log-handler/index";

describe("log-handler handler", () => {
  beforeEach(() => {
    process.env.POWERTOOLS_SERVICE_NAME = "lemuel";
    process.env.POWERTOOLS_LOG_LEVEL = "DEBUG";
  });

  it("returns 202 for a valid info log", async () => {
    const event = {
      body: JSON.stringify({ level: "info", message: "Test log entry" }),
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);
    expect(result.statusCode).toBe(202);
    expect(JSON.parse(result.body)).toEqual({ accepted: true });
  });

  it("returns 202 for all valid log levels", async () => {
    for (const level of ["debug", "info", "warn", "error"]) {
      const event = {
        body: JSON.stringify({ level, message: `Test ${level} log` }),
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event);
      expect(result.statusCode).toBe(202);
    }
  });

  it("includes context when provided", async () => {
    const event = {
      body: JSON.stringify({
        level: "info",
        message: "Test with context",
        context: { userId: "abc-123", action: "sign-in" },
      }),
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);
    expect(result.statusCode).toBe(202);
  });

  it("returns 202 for an unknown log level", async () => {
    const event = {
      body: JSON.stringify({ level: "unknown", message: "Test" }),
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);
    expect(result.statusCode).toBe(202);
  });

  it("returns 202 for malformed JSON body", async () => {
    const event = {
      body: "not-json",
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);
    expect(result.statusCode).toBe(202);
  });

  it("returns 202 for empty body", async () => {
    const event = {
      body: "{}",
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);
    expect(result.statusCode).toBe(202);
  });
});
