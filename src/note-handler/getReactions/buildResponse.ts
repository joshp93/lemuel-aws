import type {
  DynamoDBDocumentClient,
  QueryCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyResult } from "aws-lambda";
import type { ReactionEntity } from "../../models/proverbStoreSchemas";
import { ReactionEntitySchema } from "../../models/proverbStoreSchemas";
import { collectDisplayNames } from "../../shared/displayNames";

/**
 * Builds the API Gateway response from the reaction query result.
 * Enriches reaction records with display names and returns counts along
 * with the full reaction list.
 *
 * @param client - DynamoDBDocumentClient
 * @param tableName - The DynamoDB table name
 * @param result - The query result containing reaction items
 * @param requestingUserId - Optional userId to indicate which reaction belongs to the requester
 * @returns An APIGatewayProxyResult with reactionCounts, reactions list, and optional userReaction
 */
export const buildGetReactionsResponse = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  result: QueryCommandOutput,
  requestingUserId: string | undefined,
): Promise<APIGatewayProxyResult> => {
  const reactions = (result.Items ?? []).map((item) =>
    ReactionEntitySchema.parse(item),
  ) as ReactionEntity[];

  const reactionCounts: Record<string, number> = {};
  let userReaction: string | undefined;

  for (const r of reactions) {
    reactionCounts[r.reactionType] = (reactionCounts[r.reactionType] ?? 0) + 1;
    if (r.reactorUuid === requestingUserId) {
      userReaction = r.reactionType;
    }
  }

  const uuids = [...new Set(reactions.map((r) => r.reactorUuid))];
  const displayNames = await collectDisplayNames(client, tableName, uuids);

  const enriched = reactions.map((r) => ({
    reactorUuid: r.reactorUuid,
    displayName: displayNames[r.reactorUuid] ?? "",
    reactionType: r.reactionType,
    createdAt: r.createdAt,
  }));

  return {
    statusCode: 200,
    body: JSON.stringify({ reactionCounts, userReaction, reactions: enriched }),
  };
};
