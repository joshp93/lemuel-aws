import {
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { VersionEntitySchema } from "../../models/proverbStoreSchemas";

/**
 * Ensures the versions metadata item exists and is up to date.
 *
 * If no versions item (pk="versions", sk="versions") is present, it creates one
 * with the provided version names. If it already exists, the new versions are
 * merged into the existing list (via Set union) and the item is updated only
 * when new versions are actually added.
 *
 * @param client - The DynamoDB DocumentClient to use.
 * @param tableName - The target DynamoDB table name.
 * @param newVersions - Version names being loaded in this invocation.
 */
export const ensureVersions = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  newVersions: string[],
): Promise<void> => {
  const versionResult = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: "versions",
        sk: "versions",
      },
    }),
  );

  if (!versionResult.Item) {
    const versionEntity = VersionEntitySchema.parse({
      versions: newVersions,
    });
    console.debug("Creating versions item", JSON.stringify(versionEntity));
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: versionEntity,
      }),
    );
  } else {
    const existingVersions =
      (versionResult.Item as { versions?: string[] }).versions || [];
    const merged = Array.from(new Set([...existingVersions, ...newVersions]));
    if (merged.length !== existingVersions.length) {
      const updatedEntity = VersionEntitySchema.parse({
        pk: "versions",
        sk: "versions",
        versions: merged,
      });
      console.debug("Updating versions item", JSON.stringify(updatedEntity));
      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: updatedEntity,
        }),
      );
    } else {
      console.debug("Versions already up to date, skipping update.");
    }
  }
};
