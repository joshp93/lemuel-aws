import { QueryCommandOutput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyResult } from "aws-lambda";
import { NoteEntitySchema } from "../../models/proverbStoreSchemas";

/**
 * Builds the API Gateway response from the DynamoDB GSI query result.
 * Validates each item against NoteEntitySchema and encodes the
 * LastEvaluatedKey as a base64 string for cursor-based pagination.
 *
 * @param result - The DynamoDB QueryCommand output
 * @returns An APIGatewayProxyResult with items and optional lastKey
 */
export const buildGetUserNotesResponse = (
  result: QueryCommandOutput,
): APIGatewayProxyResult => {
  const items = (result.Items ?? []).map((item) =>
    NoteEntitySchema.parse(item),
  );

  let lastKey: string | undefined;
  if (result.LastEvaluatedKey) {
    lastKey = Buffer.from(
      JSON.stringify(result.LastEvaluatedKey),
    ).toString("base64");
  }

  console.log(
    `[getUserNotes] Building response with ${items.length} items`,
    { hasMore: !!lastKey },
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ items, lastKey }),
  };
};
