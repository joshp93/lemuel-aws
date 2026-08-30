import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import {
  DailyProverbEntitySchema,
  ProverbEntitySchema,
  VersionCitationSchema,
} from "../models/proverbStoreSchemas";
import type { ProverbWidgetData } from "./proverbWidget";

/**
 * Fetches today's proverb from DynamoDB for the given Bible version.
 * Resolves the daily-proverb ref, then fetches the proverb text and optional citation.
 */
export const fetchTodayProverb = async (
  version: string,
): Promise<ProverbWidgetData> => {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const tableName = process.env.TABLE_NAME!;
  const today = new Date().toISOString().split("T")[0];

  const dailyEntityResult = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: "daily-proverb",
        sk: today,
      },
    }),
  );
  const dailyEntity = DailyProverbEntitySchema.parse(dailyEntityResult.Item!);

  const proverbEntityResult = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: `${version}#${dailyEntity.ref}`,
        sk: dailyEntity.ref,
      },
    }),
  );
  const proverbEntity = ProverbEntitySchema.parse(proverbEntityResult.Item!);

  const citationEntityResult = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: "citation",
        sk: proverbEntity.version,
      },
    }),
  );

  let citation: string | undefined;
  if (citationEntityResult.Item) {
    const citationEntity = VersionCitationSchema.parse(
      citationEntityResult.Item,
    );
    citation = citationEntity.citation;
  }

  return {
    ref: proverbEntity.proverb.ref,
    proverb: proverbEntity.proverb.proverb,
    ...(citation ? { citation } : {}),
  };
};
