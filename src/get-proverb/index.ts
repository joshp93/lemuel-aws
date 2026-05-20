import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  ProverbEntitySchema,
  ProverbForTheDayEntitySchema,
  VersionCitationSchema,
} from "../models/proverbStoreSchemas";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const tableName = process.env.TABLE_NAME!;
  const proverbForTheDayEntityResults = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: "proverb-for-the-day",
        sk: "proverb-for-the-day",
      },
    }),
  );
  const proverbForTheDayEntity = ProverbForTheDayEntitySchema.parse(
    proverbForTheDayEntityResults.Item!,
  );
  const proverbEntityResult = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: `${event.pathParameters!.version}#${proverbForTheDayEntity.ref}`,
        sk: proverbForTheDayEntity.ref,
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
    const citationEntity = VersionCitationSchema.parse(citationEntityResult.Item);
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
