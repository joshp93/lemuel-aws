import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  DailyProverbEntitySchema,
  ProverbEntitySchema,
  VersionCitationSchema,
} from "../models/proverbStoreSchemas";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const tableName = process.env.TABLE_NAME!;
  const date =
    event.queryStringParameters?.date ?? new Date().toISOString().split("T")[0];

  const dailyProverbEntityResult = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: "daily-proverb",
        sk: date,
      },
    }),
  );
  const dailyProverbEntity = DailyProverbEntitySchema.parse(
    dailyProverbEntityResult.Item!,
  );
  const proverbEntityResult = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: `${event.pathParameters!.version}#${dailyProverbEntity.ref}`,
        sk: dailyProverbEntity.ref,
      },
    }),
  );
  const proverbEntity = ProverbEntitySchema.parse(proverbEntityResult.Item!);

  const citationEntityResult = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: "citation",
        sk: proverbEntity.version,
      },
    }),
  );

  let citation: string | undefined;
  if (citationEntityResult.Item) {
    const citationEntity = VersionCitationSchema.parse(
      citationEntityResult.Item,
    );
    citation = citationEntity.citation;
  }

  const response = JSON.stringify({
    ...proverbEntity.proverb,
    ...(citation && { citation }),
  });

  console.debug("Proverb for the day:", response);
  return {
    statusCode: 200,
    body: response,
  };
};
