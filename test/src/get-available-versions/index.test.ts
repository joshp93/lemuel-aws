import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { handler } from "../../../src/get-available-versions/index";

describe("get-available-versions handler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  beforeEach(() => {
    ddbMock.resetHistory();
    process.env.TABLE_NAME = "TestTable";
  });

  it("returns the list of available versions", async () => {
    ddbMock
      .on(GetCommand, {
        TableName: process.env.TABLE_NAME,
        Key: {
          pk: "versions",
          sk: "versions",
        },
      })
      .resolves({
        Item: {
          pk: "versions",
          sk: "versions",
          versions: ["kjv", "nasb", "esv"],
        },
      });

    const event = {} as unknown as APIGatewayProxyEvent;

    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain("kjv");
    expect(result.body).toContain("nasb");
    expect(result.body).toContain("esv");
  });

  it("returns empty array when no versions exist", async () => {
    ddbMock
      .on(GetCommand, {
        TableName: process.env.TABLE_NAME,
        Key: {
          pk: "versions",
          sk: "versions",
        },
      })
      .resolves({
        Item: {
          pk: "versions",
          sk: "versions",
          versions: [],
        },
      });

    const event = {} as unknown as APIGatewayProxyEvent;

    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("[]");
  });
});