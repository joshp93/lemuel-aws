import { type DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

/** Fetches the displayName from a user's account record in DynamoDB.
 *  Returns an empty string if the record or displayName attribute is missing. */
export const fetchDisplayName = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  uuid: string,
): Promise<string> => {
  const result = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: uuid, sk: "account" },
    }),
  );
  return (result.Item?.displayName as string) ?? "";
};
