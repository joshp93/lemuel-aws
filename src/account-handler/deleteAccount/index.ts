import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  BatchWriteCommand,
  type DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { AccountHandlerEnv } from "../models";

const cognitoClient = new CognitoIdentityProviderClient({});

export const deleteAccountHandler = async (
  client: DynamoDBDocumentClient,
  env: AccountHandlerEnv,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const uuid = event.pathParameters!.uuid!;
    const claims = event.requestContext.authorizer?.claims as
      | Record<string, string>
      | undefined;
    const sub = claims?.sub;

    if (sub !== uuid) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Forbidden" }),
      };
    }

    const tableName = env.TABLE_NAME;

    const deleteRequests: Array<{
      DeleteRequest: { Key: Record<string, string> };
    }> = [];

    const userItems = await client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": uuid },
      }),
    );
    for (const item of userItems.Items ?? []) {
      deleteRequests.push({
        DeleteRequest: {
          Key: { pk: item.pk as string, sk: item.sk as string },
        },
      });
    }

    const meditationItems = await client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": `meditation#${uuid}` },
      }),
    );
    for (const item of meditationItems.Items ?? []) {
      deleteRequests.push({
        DeleteRequest: {
          Key: { pk: item.pk as string, sk: item.sk as string },
        },
      });
    }

    for (let i = 0; i < deleteRequests.length; i += 25) {
      const chunk = deleteRequests.slice(i, i + 25);
      await client.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName]: chunk,
          },
        }),
      );
    }

    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: env.USER_POOL_ID!,
        Username: uuid,
      }),
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("[deleteAccount] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
