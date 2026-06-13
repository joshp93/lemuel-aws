import {
  BatchGetCommand,
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { handler } from "../../../src/choose-proverb/index";

describe("choose-proverb handler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  beforeEach(() => {
    ddbMock.resetHistory();
    process.env.TABLE_NAME = "TestTable";
  });

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const refsItem = {
    pk: "refs",
    sk: "refs",
    allRefs: ["Proverbs10:1", "Proverbs10:2", "Proverbs10:3"],
    usedRefs: ["Proverbs10:1"],
  };

  const buildBatchGetResponse = (items: Record<string, unknown>[]) => ({
    Responses: { TestTable: items },
  });

  it("today missing — writes both today + tomorrow entities, 2 usedRefs added", async () => {
    ddbMock.on(BatchGetCommand).resolves(buildBatchGetResponse([refsItem]));
    ddbMock.on(BatchWriteCommand).resolves({});

    await handler();

    const calls = ddbMock.commandCalls(BatchWriteCommand);
    expect(calls).toHaveLength(1);

    const putRequests = calls[0].args[0].input.RequestItems!.TestTable!;
    expect(putRequests).toHaveLength(3);

    const items = putRequests.map((r) => r.PutRequest!.Item!);
    const dailyProverbItems = items.filter((i) => i.pk === "daily-proverb");
    expect(dailyProverbItems).toHaveLength(2);

    const sks = dailyProverbItems.map((i) => i.sk).sort();
    expect(sks).toEqual([today, tomorrow]);

    const refsPut = items.find((i) => i.pk === "refs");
    expect(refsPut!.usedRefs).toHaveLength(3);
  });

  it("today exists — writes only tomorrow, 1 usedRef added", async () => {
    ddbMock.on(BatchGetCommand).resolves(
      buildBatchGetResponse([
        {
          pk: "daily-proverb",
          sk: today,
          ref: "Proverbs10:1",
        },
        refsItem,
      ]),
    );
    ddbMock.on(BatchWriteCommand).resolves({});

    await handler();

    const calls = ddbMock.commandCalls(BatchWriteCommand);
    expect(calls).toHaveLength(1);

    const putRequests = calls[0].args[0].input.RequestItems!.TestTable!;
    expect(putRequests).toHaveLength(2);

    const items = putRequests.map((r) => r.PutRequest!.Item!);
    const dailyProverbItems = items.filter((i) => i.pk === "daily-proverb");
    expect(dailyProverbItems).toHaveLength(1);
    expect(dailyProverbItems[0].sk).toBe(tomorrow);

    const refsPut = items.find((i) => i.pk === "refs");
    expect(refsPut!.usedRefs).toHaveLength(2);
  });

  it("full reset cycle when all refs are used", async () => {
    const allUsedRefs = {
      pk: "refs",
      sk: "refs",
      allRefs: ["Proverbs10:1", "Proverbs10:2"],
      usedRefs: ["Proverbs10:1", "Proverbs10:2"],
    };

    ddbMock.on(BatchGetCommand).resolves(buildBatchGetResponse([allUsedRefs]));
    ddbMock.on(BatchWriteCommand).resolves({});

    await handler();

    const calls = ddbMock.commandCalls(BatchWriteCommand);
    expect(calls).toHaveLength(1);

    const putRequests = calls[0].args[0].input.RequestItems!.TestTable!;
    const refsPut = putRequests.find((r) => r.PutRequest!.Item!.pk === "refs")!
      .PutRequest!.Item!;
    expect(refsPut.usedRefs).toHaveLength(2);
  });
});
