import * as fs from "node:fs";
import * as path from "node:path";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { LoadProverbsEventSchema } from "../../../src/load-proverbs/eventSchemas";
import { handler } from "../../../src/load-proverbs/index";

describe(handler.name, () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const testJsonPath = path.join(__dirname, "test-data", "kjv.json");
  let testJson: string;

  beforeAll(() => {
    testJson = fs.readFileSync(testJsonPath, "utf8");
    process.env.TABLE_NAME = "TestTable";
  });

  beforeEach(() => {
    ddbMock.resetHistory();
  });

  const mockRefsExists = () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        pk: "refs",
        sk: "refs",
        allRefs: ["existing"],
      },
    });
  };

  it("Should batch write proverbs in groups of 25 with correct PK/SK/proverb", async () => {
    const parsed = LoadProverbsEventSchema.parse(JSON.parse(testJson));
    ddbMock.on(BatchWriteCommand).resolves({
      UnprocessedItems: {},
      ItemCollectionMetrics: {},
    });
    mockRefsExists();
    ddbMock.on(GetCommand).resolves({
      Item: {
        pk: "versions",
        sk: "versions",
        versions: ["web"],
      },
    });
    ddbMock.on(PutCommand).resolves({});

    await handler(parsed);

    const total = parsed.proverbs.length;
    const expectedBatches = Math.ceil(total / 25);
    expect(ddbMock.commandCalls(BatchWriteCommand).length).toBe(
      expectedBatches,
    );

    for (let i = 0; i < expectedBatches; i++) {
      const call = ddbMock.commandCalls(BatchWriteCommand)[i];
      const batchStart = i * 25;
      const batchEnd = Math.min(batchStart + 25, total);
      const requestItems = call.args[0].input.RequestItems!.TestTable;
      expect(requestItems.length).toBe(batchEnd - batchStart);

      for (const item of requestItems) {
        expect(item.PutRequest!.Item!.pk).toMatch(
          /^kjv#Proverbs\d+:\d+(-\d+)?$/,
        );
        expect(item.PutRequest!.Item!.sk).toMatch(/^Proverbs\d+:\d+(-\d+)?$/);
        expect(typeof item.PutRequest!.Item!.proverb).toBe("object");
        expect(typeof item.PutRequest!.Item!.proverb.proverb).toBe("string");
      }
    }
  });

  it("Should create versions item if it doesn't exist", async () => {
    const parsed = LoadProverbsEventSchema.parse(JSON.parse(testJson));
    ddbMock.on(BatchWriteCommand).resolves({
      UnprocessedItems: {},
      ItemCollectionMetrics: {},
    });
    mockRefsExists();
    ddbMock.on(GetCommand).resolves({
      Item: undefined,
    });
    ddbMock.on(PutCommand).resolves({});

    await handler(parsed);

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls.length).toBe(2);

    const versionsCall = putCalls.find((call) => {
      const item = call.args[0].input.Item;
      return item?.pk === "versions" && item?.sk === "versions";
    });
    expect(versionsCall).toBeDefined();
    expect((versionsCall as any).args[0].input.Item.versions).toContain("kjv");
  });

  it("Should append version to existing versions list", async () => {
    const parsed = LoadProverbsEventSchema.parse(JSON.parse(testJson));
    ddbMock.on(BatchWriteCommand).resolves({
      UnprocessedItems: {},
      ItemCollectionMetrics: {},
    });
    mockRefsExists();
    ddbMock.on(GetCommand).resolves({
      Item: {
        pk: "versions",
        sk: "versions",
        versions: ["web"],
      },
    });
    ddbMock.on(PutCommand).resolves({});

    await handler(parsed);

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls.length).toBe(1);

    const versionsCall = putCalls[0] as any;
    expect(versionsCall.args[0].input.Item.versions).toEqual(["web", "kjv"]);
  });

  it("Should not update versions if already in list", async () => {
    const parsed = LoadProverbsEventSchema.parse(JSON.parse(testJson));
    ddbMock.on(BatchWriteCommand).resolves({
      UnprocessedItems: {},
      ItemCollectionMetrics: {},
    });
    mockRefsExists();
    ddbMock.on(GetCommand).resolves({
      Item: {
        pk: "versions",
        sk: "versions",
        versions: ["kjv", "web"],
      },
    });
    ddbMock.on(PutCommand).resolves({});

    await handler(parsed);

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls.length).toBe(0);
  });
});
