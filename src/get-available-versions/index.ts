import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { VersionEntitySchema } from "../models/proverbStoreSchemas";

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
  const response = JSON.stringify(entity.versions.sort((a, b) => a.localeCompare(b)));

  console.debug("Available versions:", response);
  return {
    statusCode: 200,
    body: response,
  };
};