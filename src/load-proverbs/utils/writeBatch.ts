import {
  BatchWriteCommand,
  type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import type { ProverbItem } from "../transforms/buildProverbItem";

/**
 * Writes an array of proverb items to DynamoDB in batches.
 *
 * DynamoDB BatchWriteItem accepts up to 25 items per request, so the items
 * array is split into chunks of `batchSize` (default 25) and each chunk is
 * sent as a separate BatchWriteCommand.
 *
 * @param client - The DynamoDB DocumentClient to use.
 * @param tableName - The target DynamoDB table name.
 * @param items - The proverb items to write.
 * @param batchSize - Number of items per batch (default 25, max 25).
 */
export const writeBatch = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  items: ProverbItem[],
  batchSize = 25,
): Promise<void> => {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const command = new BatchWriteCommand({
      RequestItems: {
        [tableName]: batch,
      },
    });
    console.debug("Batch Write Command:", JSON.stringify(command));
    const response = await client.send(command);
    console.debug("Batch Write Response:", JSON.stringify(response));
  }
};
