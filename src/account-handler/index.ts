import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createAccountHandler } from "./createAccount/index";
import { getAccountDetailsHandler } from "./getAccountDetails/index";
import { AccountHandlerEnvSchema } from "./models";
import { updateMeditationsHandler } from "./updateMeditations/index";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  console.log(
    `[account-handler] Routing request: ${event.httpMethod} ${event.resource}`,
    { pathParams: event.pathParameters },
  );

  try {
    const env = AccountHandlerEnvSchema.parse(process.env);
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

    const route = `${event.httpMethod} ${event.resource}`;
    switch (route) {
      case "GET /accounts/{uuid}":
        return getAccountDetailsHandler(client, env, event);
      case "POST /accounts/{uuid}/create":
        return createAccountHandler(client, env, event);
      case "POST /accounts/{uuid}/meditations/{date}":
        return updateMeditationsHandler(client, env, event);
      default:
        console.warn(`[account-handler] Unsupported route: ${route}`);
        return {
          statusCode: 405,
          body: JSON.stringify({ error: "Method not allowed" }),
        };
    }
  } catch (error) {
    console.error(`[account-handler] Unhandled error:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
