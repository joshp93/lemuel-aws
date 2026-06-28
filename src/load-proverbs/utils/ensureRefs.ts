import {
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import type { RefsEntity } from "../../models/proverbStoreSchemas";

/**
 * Ensures the refs metadata item exists in DynamoDB.
 *
 * If no refs item (pk="refs", sk="refs") is present, it creates one with the
 * provided list of all references and an empty `usedRefs` array. If the item
 * already exists it is left untouched.
 *
 * @param client - The DynamoDB DocumentClient to use.
 * @param tableName - The target DynamoDB table name.
 * @param allRefs - Complete list of scripture references to store.
 */
export const ensureRefs = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  allRefs: string[],
): Promise<void> => {
  const refsResult = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: "refs",
        sk: "refs",
      },
    }),
  );

  if (!refsResult.Item) {
    const refs: RefsEntity = {
      pk: "refs",
      sk: "refs",
      allRefs,
      usedRefs: [],
    };

    console.debug("Creating refs item", JSON.stringify(refs));
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: refs,
      }),
    );
  } else {
    console.debug("Refs item already exists, skipping creation.");
  }
};
