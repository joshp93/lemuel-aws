import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  DailyProverbEntitySchema,
  RefsEntitySchema,
} from "../models/proverbStoreSchemas";

export const handler = async (): Promise<void> => {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const tableName = process.env.TABLE_NAME!;
  const refsResult = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: "refs",
        sk: "refs",
      },
    }),
  );
  const refs = RefsEntitySchema.parse(refsResult.Item);

  if (refs.usedRefs.length === refs.allRefs.length) {
    refs.usedRefs = [];
  }
  const unusedRefs = refs.allRefs.filter((ref) => !refs.usedRefs.includes(ref));
  const randomRef = unusedRefs[Math.floor(Math.random() * unusedRefs.length)];

  refs.usedRefs.push(randomRef);

  const today = new Date().toISOString().split("T")[0];

  const putDailyProverbPromise = client.send(
    new PutCommand({
      TableName: tableName,
      Item: DailyProverbEntitySchema.parse({
        pk: "daily-proverb",
        sk: today,
        ref: randomRef,
      }),
    }),
  );
  const putRefsPromise = client.send(
    new PutCommand({
      TableName: tableName,
      Item: refs,
    }),
  );
  await Promise.all([putDailyProverbPromise, putRefsPromise]);
};
