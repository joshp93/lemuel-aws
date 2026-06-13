import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import {
  DailyProverbEntitySchema,
  RefsEntitySchema,
} from "../models/proverbStoreSchemas";

export const handler = async (): Promise<void> => {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const tableName = process.env.TABLE_NAME!;

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const batchGetResult = await client.send(
    new BatchGetCommand({
      RequestItems: {
        [tableName]: {
          Keys: [
            { pk: "daily-proverb", sk: today },
            { pk: "refs", sk: "refs" },
          ],
        },
      },
    }),
  );

  const items = batchGetResult.Responses![tableName]!;
  const todayEntity = items.find((i) => i.pk === "daily-proverb");
  const refsItem = items.find((i) => i.pk === "refs");
  const refs = RefsEntitySchema.parse(refsItem);
  if (refs.usedRefs.length === refs.allRefs.length) {
    refs.usedRefs = [];
  }

  const pickUnused = (): string => {
    const unused = refs.allRefs.filter((r) => !refs.usedRefs.includes(r));
    const pick = unused[Math.floor(Math.random() * unused.length)];
    refs.usedRefs.push(pick);
    return pick;
  };

  const putRequests: { PutRequest: { Item: Record<string, unknown> } }[] = [];

  if (!todayEntity) {
    const todayRef = pickUnused();
    putRequests.push({
      PutRequest: {
        Item: DailyProverbEntitySchema.parse({
          pk: "daily-proverb",
          sk: today,
          ref: todayRef,
        }) as Record<string, unknown>,
      },
    });
  }

  const tomorrowRef = pickUnused();
  putRequests.push({
    PutRequest: {
      Item: DailyProverbEntitySchema.parse({
        pk: "daily-proverb",
        sk: tomorrow,
        ref: tomorrowRef,
      }) as Record<string, unknown>,
    },
  });

  putRequests.push({ PutRequest: { Item: refs as Record<string, unknown> } });

  await client.send(
    new BatchWriteCommand({
      RequestItems: { [tableName]: putRequests },
    }),
  );
};
