import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DailyProverbEntitySchema } from "../models/proverbStoreSchemas";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const tableName = process.env.TABLE_NAME!;

  const limit = event.queryStringParameters?.limit
    ? parseInt(event.queryStringParameters.limit, 10)
    : undefined;

  const scanForward = event.queryStringParameters?.scanForward === "true";

  const month = event.queryStringParameters?.month;

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (event.queryStringParameters?.lastKey) {
    exclusiveStartKey = JSON.parse(
      Buffer.from(event.queryStringParameters.lastKey, "base64").toString(
        "utf-8",
      ),
    );
  }

  const expressionAttributeValues: Record<string, string> = {
    ":pk": "daily-proverb",
  };

  let keyConditionExpression = "pk = :pk";
  if (month) {
    keyConditionExpression = "pk = :pk AND begins_with(sk, :monthPrefix)";
    expressionAttributeValues[":monthPrefix"] = month;
  }

  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
      ScanIndexForward: scanForward,
    }),
  );

  const items = (result.Items ?? []).map((item) =>
    DailyProverbEntitySchema.parse(item),
  );

  let lastKey: string | undefined;
  if (result.LastEvaluatedKey) {
    lastKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
      "base64",
    );
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ items, lastKey }),
  };
};
