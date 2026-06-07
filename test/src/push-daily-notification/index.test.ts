import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { handler } from "../../../src/push-daily-notification/index";

describe("push-daily-notification handler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.resetHistory();
    process.env.TABLE_NAME = "TestTable";
    process.env.FCM_SECRET_NAME = "fcm-server-creds";
  });

  const today = new Date().toISOString().split("T")[0];

  it("skips when no daily-proverb found for today", async () => {
    ddbMock.on(GetCommand).resolves({});

    await expect(handler()).resolves.toBeUndefined();
  });

  it("skips when no opted-in devices returned from GSI", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { pk: "daily-proverb", sk: today, ref: "Proverbs29:14" },
    });
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    await expect(handler()).resolves.toBeUndefined();
  });
});