import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { AccountHandlerEnv, UpdateMeditationsResponse } from "../models";
import { MeditationEntitySchema } from "../../models/proverbStoreSchemas";

export const updateMeditationsHandler = async (
  client: DynamoDBDocumentClient,
  env: AccountHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const uuid = event.pathParameters?.uuid ?? "";
    const date = event.pathParameters?.date ?? "";

    const meditation = MeditationEntitySchema.parse({
      pk: `meditation#${uuid}`,
      sk: date,
      uuid,
      date,
    });

    await client.send(
      new PutCommand({
        TableName: env.TABLE_NAME,
        Item: meditation,
      }),
    );

    const queryResult = await client.send(
      new QueryCommand({
        TableName: env.TABLE_NAME,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": `meditation#${uuid}` },
        Select: "COUNT",
      }),
    );

    await client.send(
      new UpdateCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: uuid, sk: "account" },
        UpdateExpression: "SET totalMeditations = :count",
        ExpressionAttributeValues: { ":count": queryResult.Count ?? 0 },
      }),
    );

    const response: UpdateMeditationsResponse = { success: true };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("[updateMeditations] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};