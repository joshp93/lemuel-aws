import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { handler } from "../../../src/get-proverb/index";

describe("get-proverbs handler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  beforeEach(() => {
    ddbMock.resetHistory();
    process.env.TABLE_NAME = "TestTable";
  });

  it("returns the proverb for the day for a version", async () => {
    const today = new Date().toISOString().split("T")[0];
    ddbMock
      .on(GetCommand, {
        TableName: process.env.TABLE_NAME,
        Key: {
          pk: "daily-proverb",
          sk: today,
        },
      })
      .resolves({
        Item: {
          pk: "daily-proverb",
          sk: today,
          ref: "Proverbs10:1",
        },
      });

    ddbMock
      .on(GetCommand, {
        TableName: process.env.TABLE_NAME,
        Key: {
          pk: "kjv#Proverbs10:1",
          sk: "Proverbs10:1",
        },
      })
      .resolves({
        Item: {
          pk: "kjv#Proverbs10:1",
          sk: "Proverbs10:1",
          version: "kjv",
          proverb: {
            ref: "Proverbs 10:1",
            proverb: "A wise son maketh a glad father...",
          },
        },
      });

    ddbMock
      .on(GetCommand, {
        TableName: process.env.TABLE_NAME,
        Key: {
          pk: "citation",
          sk: "kjv",
        },
      })
      .resolves({});

    const event = {
      pathParameters: { version: "kjv" },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain("A wise son maketh a glad father");
  });

  it("uses the date query parameter when provided", async () => {
    ddbMock
      .on(GetCommand, {
        TableName: process.env.TABLE_NAME,
        Key: {
          pk: "daily-proverb",
          sk: "2025-01-01",
        },
      })
      .resolves({
        Item: {
          pk: "daily-proverb",
          sk: "2025-01-01",
          ref: "Proverbs10:2",
        },
      });

    ddbMock
      .on(GetCommand, {
        TableName: process.env.TABLE_NAME,
        Key: {
          pk: "kjv#Proverbs10:2",
          sk: "Proverbs10:2",
        },
      })
      .resolves({
        Item: {
          pk: "kjv#Proverbs10:2",
          sk: "Proverbs10:2",
          version: "kjv",
          proverb: {
            ref: "Proverbs 10:2",
            proverb: "Treasures of wickedness profit nothing...",
          },
        },
      });

    ddbMock
      .on(GetCommand, {
        TableName: process.env.TABLE_NAME,
        Key: {
          pk: "citation",
          sk: "kjv",
        },
      })
      .resolves({});

    const event = {
      pathParameters: { version: "kjv" },
      queryStringParameters: { date: "2025-01-01" },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain("Treasures of wickedness profit nothing");
  });
});
