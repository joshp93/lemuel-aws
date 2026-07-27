import {
  BatchGetCommand,
  type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

/**
 * Batch-fetches display names for a list of user UUIDs from DynamoDB.
 *
 * Display names are stored on the account entity (pk = uuid, sk = "account").
 *
 * @param client    - DynamoDBDocumentClient
 * @param tableName - The DynamoDB table name
 * @param uuids     - Array of user UUIDs to look up
 * @returns A record mapping uuid → displayName for found entities
 */
export const collectDisplayNames = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  uuids: string[],
): Promise<Record<string, string>> => {
  if (uuids.length === 0) return {};

  const uniqueUuids = [...new Set(uuids)];
  const keys = uniqueUuids.map((uuid) => ({
    pk: uuid,
    sk: "account",
  }));

  const result = await client.send(
    new BatchGetCommand({
      RequestItems: {
        [tableName]: {
          Keys: keys,
        },
      },
    }),
  );

  const displayNames: Record<string, string> = {};
  const responses = result?.Responses?.[tableName] ?? [];
  const foundUuids = new Set<string>();

  for (const item of responses) {
    const uuid = item.pk as string;
    foundUuids.add(uuid);
    displayNames[uuid] = (item.displayName as string) ?? "";
  }

  for (const uuid of uniqueUuids) {
    if (!foundUuids.has(uuid)) {
      displayNames[uuid] = "";
    }
  }

  return displayNames;
};
