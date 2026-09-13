import {
  type DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

/**
 * Looks up the reply's sort key for a given user and note context
 * by querying the user's reply-tracker items.
 *
 * The reply tracker's sort key follows the format
 * `reply-tracker#{noteAuthorUuid}#{ref}#{date}#{replySk}`.
 * This function strips the known prefix to recover the `replySk`.
 *
 * @param client - The DynamoDB document client.
 * @param tableName - The DynamoDB table name.
 * @param userId - The replying user's Cognito UUID.
 * @param noteAuthorUuid - The note author's Cognito UUID.
 * @param ref - The proverb reference, e.g. `Proverbs3:5`.
 * @param date - The date of the daily proverb, e.g. `2026-06-16`.
 * @returns The reply sort key if found.
 * @throws If no tracker item exists for this user and note.
 */
export async function findReplySk(
  client: DynamoDBDocumentClient,
  tableName: string,
  userId: string,
  noteAuthorUuid: string,
  ref: string,
  date: string,
): Promise<string> {
  const trackerPrefix = `reply-tracker#${noteAuthorUuid}#${ref}#${date}#`;

  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": userId,
        ":skPrefix": trackerPrefix,
      },
      Limit: 1,
    }),
  );

  const trackerItem = result.Items?.[0];
  if (!trackerItem?.sk) {
    throw new Error("Reply tracker not found");
  }

  return (trackerItem.sk as string).slice(trackerPrefix.length);
}
