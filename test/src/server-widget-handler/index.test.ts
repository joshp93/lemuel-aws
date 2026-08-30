import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { fetchTodayProverb } from "../../../src/server-widget-handler/fetchTodayProverb";

describe("fetchTodayProverb", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
    process.env.TABLE_NAME = "TestTable";
  });

  const today = new Date().toISOString().split("T")[0];

  it("fetches today's proverb and citation for a given version", async () => {
    ddbMock
      .on(GetCommand, {
        TableName: process.env.TABLE_NAME,
        Key: { pk: "daily-proverb", sk: today },
      })
      .resolves({
        Item: { pk: "daily-proverb", sk: today, ref: "Proverbs10:1" },
      });

    ddbMock
      .on(GetCommand, {
        TableName: process.env.TABLE_NAME,
        Key: { pk: "kjv#Proverbs10:1", sk: "Proverbs10:1" },
      })
      .resolves({
        Item: {
          pk: "kjv#Proverbs10:1",
          sk: "Proverbs10:1",
          version: "kjv",
          proverb: { ref: "Proverbs 10:1", proverb: "A wise son..." },
        },
      });

    ddbMock
      .on(GetCommand, {
        TableName: process.env.TABLE_NAME,
        Key: { pk: "citation", sk: "kjv" },
      })
      .resolves({
        Item: { pk: "citation", sk: "kjv", citation: "King James Version" },
      });

    const result = await fetchTodayProverb("kjv");

    expect(result).toEqual({
      ref: "Proverbs 10:1",
      proverb: "A wise son...",
      citation: "King James Version",
    });
  });

  it("returns proverb without citation when no citation entity exists", async () => {
    ddbMock
      .on(GetCommand, {
        TableName: process.env.TABLE_NAME,
        Key: { pk: "daily-proverb", sk: today },
      })
      .resolves({
        Item: { pk: "daily-proverb", sk: today, ref: "Proverbs10:1" },
      });

    ddbMock
      .on(GetCommand, {
        TableName: process.env.TABLE_NAME,
        Key: { pk: "niv#Proverbs10:1", sk: "Proverbs10:1" },
      })
      .resolves({
        Item: {
          pk: "niv#Proverbs10:1",
          sk: "Proverbs10:1",
          version: "niv",
          proverb: { ref: "Proverbs 10:1", proverb: "A wise son..." },
        },
      });

    ddbMock
      .on(GetCommand, {
        TableName: process.env.TABLE_NAME,
        Key: { pk: "citation", sk: "niv" },
      })
      .resolves({});

    const result = await fetchTodayProverb("niv");

    expect(result).toEqual({
      ref: "Proverbs 10:1",
      proverb: "A wise son...",
    });
  });
});
