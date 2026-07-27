import type {
  DynamoDBDocumentClient,
  QueryCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyResult } from "aws-lambda";
import type { NoteEntity } from "../../models/proverbStoreSchemas";
import { NoteEntitySchema } from "../../models/proverbStoreSchemas";
import { collectDisplayNames } from "../../shared/displayNames";

/**
 * Filters a list of note entities to exclude private notes that don't belong
 * to the requesting user. The author of a private note can still see their own
 * notes, but other users' private notes are excluded from community views.
 *
 * @param notes  - The full list of parsed note entities
 * @param userId - The requesting user's Cognito UUID (optional). When provided,
 *                 private notes owned by this user are included in the result.
 * @returns The filtered list of notes visible to the requesting user
 */
export const filterNotesForUser = (
  notes: NoteEntity[],
  userId: string | undefined,
): NoteEntity[] =>
  notes.filter((note) => !note.isPrivate || note.uuid === userId);

/**
 * Builds the API Gateway response from the DynamoDB GSI query result.
 * Validates each item against NoteEntitySchema, filters private notes that
 * don't belong to the requesting user, and encodes the LastEvaluatedKey as
 * a base64 string for cursor-based pagination.
 *
 * @param result - The DynamoDB QueryCommand output
 * @param userId - The requesting user's Cognito UUID (optional). Private notes
 *                 owned by this user are included in the community response.
 * @returns An APIGatewayProxyResult with items and optional lastKey
 */
export const buildGetProverbNotesResponse = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  result: QueryCommandOutput,
  userId: string | undefined,
): Promise<APIGatewayProxyResult> => {
  const items = filterNotesForUser(
    (result.Items ?? []).map((item) => NoteEntitySchema.parse(item)),
    userId,
  );

  const uuids = [...new Set(items.map((n) => n.uuid))];
  const displayNames = await collectDisplayNames(client, tableName, uuids);
  const enriched = items.map((item) => ({
    ...item,
    displayName: displayNames[item.uuid] ?? "",
  }));

  let lastKey: string | undefined;
  if (result.LastEvaluatedKey) {
    lastKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
      "base64",
    );
  }

  console.log(
    `[getProverbNotes] Building response with ${enriched.length} items`,
    { hasMore: !!lastKey, userId: userId ?? "anonymous" },
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ items: enriched, lastKey }),
  };
};
