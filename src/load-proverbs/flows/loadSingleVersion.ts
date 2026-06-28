import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { VersionOutput } from "../eventSchemas";
import { buildProverbItem } from "../transforms/buildProverbItem";
import { writeBatch } from "../utils/writeBatch";

/**
 * Result produced after loading all proverbs for a single Bible version.
 */
export interface SingleVersionResult {
  /** The Bible version identifier. */
  version: string;
  /** The space-free scripture references loaded for this version. */
  refs: string[];
  /** Optional citation text for the version. */
  citation?: string;
}

/**
 * Loads all proverbs for a single Bible version into DynamoDB.
 *
 * Transforms each proverb into a DynamoDB PutRequest item, writes them in
 * batches of up to 25, and returns a summary containing the version name,
 * the list of references written, and any citation provided.
 *
 * @param client - The DynamoDB DocumentClient to use.
 * @param tableName - The target DynamoDB table name.
 * @param versionOutput - The version payload containing proverbs and metadata.
 * @returns A summary of what was written for this version.
 */
export const loadSingleVersion = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  versionOutput: VersionOutput,
): Promise<SingleVersionResult> => {
  const { version, proverbs, citation } = versionOutput;

  const items = proverbs.map((proverb) => buildProverbItem(proverb, version));
  await writeBatch(client, tableName, items);

  return {
    version,
    refs: proverbs.map((p) => p.ref.replace(/\s+/g, "")),
    citation,
  };
};
