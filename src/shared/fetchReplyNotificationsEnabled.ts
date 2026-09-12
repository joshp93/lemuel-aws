import { type DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

/** Fetches the replyNotificationsEnabled flag from a user's account record.
 *  Defaults to true when the attribute is absent. */
export const fetchReplyNotificationsEnabled = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  uuid: string,
): Promise<boolean> => {
  const result = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: uuid, sk: "account" },
    }),
  );
  return (result.Item?.replyNotificationsEnabled as boolean) ?? true;
};
