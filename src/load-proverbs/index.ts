import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { VersionCitationSchema } from "../models/proverbStoreSchemas";
import {
  type LoadProverbsEvent,
  LoadProverbsEventSchema,
} from "./eventSchemas";
import { loadSingleVersion } from "./flows/loadSingleVersion";
import { ensureRefs } from "./utils/ensureRefs";
import { ensureVersions } from "./utils/ensureVersions";

/**
 * Lambda handler that loads proverbs for one or more Bible versions into DynamoDB.
 *
 * For each version in the event array the handler:
 *  1. Writes every proverb item via batch writes.
 *  2. Ensures the refs metadata item exists.
 *  3. Ensures the versions metadata item exists (merging new versions).
 *  4. Persists any citation metadata for each version.
 *
 * @param event - An array of version outputs, each containing proverbs and optional citation.
 */
export const handler = async (event: LoadProverbsEvent): Promise<void> => {
  console.debug("Event:", JSON.stringify(event));
  LoadProverbsEventSchema.parse(event);

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const tableName = process.env.TABLE_NAME!;

  const versionResults = await Promise.all(
    event.map((v) => loadSingleVersion(client, tableName, v)),
  );

  const allRefs = versionResults.flatMap((r) => r.refs);
  await ensureRefs(client, tableName, allRefs);

  const allVersionNames = versionResults.map((r) => r.version);
  await ensureVersions(client, tableName, allVersionNames);

  for (const result of versionResults) {
    if (result.citation) {
      const citationEntity = VersionCitationSchema.parse({
        pk: "citation",
        sk: result.version,
        citation: result.citation,
      });
      console.debug(
        "Creating/updating citation item",
        JSON.stringify(citationEntity),
      );
      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: citationEntity,
        }),
      );
    }
  }
};
