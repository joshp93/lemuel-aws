import {
  type DynamoDBDocumentClient,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { AccountHandlerEnv } from "../models";
import type { UpdateAccount } from "./models/types";

export const updateAccountHandler = async (
  client: DynamoDBDocumentClient,
  env: AccountHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const uuid = event.pathParameters!.uuid;
    const body = JSON.parse(event.body ?? "{}") as UpdateAccount;

    const updateExpressionParts: string[] = [];
    const expressionAttributeValues: Record<string, unknown> = {};
    const expressionAttributeNames: Record<string, string> = {};

    if (body.displayName !== undefined) {
      updateExpressionParts.push("#displayName = :displayName");
      expressionAttributeValues[":displayName"] = body.displayName;
      expressionAttributeNames["#displayName"] = "displayName";
    }

    if (body.replyNotificationsEnabled !== undefined) {
      updateExpressionParts.push(
        "#replyNotificationsEnabled = :replyNotificationsEnabled",
      );
      expressionAttributeValues[":replyNotificationsEnabled"] =
        body.replyNotificationsEnabled;
      expressionAttributeNames["#replyNotificationsEnabled"] =
        "replyNotificationsEnabled";
    }

    if (updateExpressionParts.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "At least one field (displayName, replyNotificationsEnabled) must be provided",
        }),
      };
    }

    await client.send(
      new UpdateCommand({
        TableName: env.TABLE_NAME,
        Key: { pk: uuid, sk: "account" },
        UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
      }),
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("[updateAccount] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
