import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { VersionEntitySchema } from "../models/proverbStoreSchemas";
import { formatResponse } from "../shared/formatResponse";
import { logger } from "../shared/logger";

export const handler = async (
  _event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const tableName = process.env.TABLE_NAME!;

  const result = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: "versions",
        sk: "versions",
      },
    }),
  );

  const entity = VersionEntitySchema.parse(result.Item!);
  const versions = entity.versions.sort((a, b) => a.localeCompare(b));

  logger.debug("Available versions:", JSON.stringify(versions));
  return formatResponse(versions);
};
