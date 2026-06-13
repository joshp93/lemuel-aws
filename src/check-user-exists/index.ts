import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
  UserNotFoundException,
} from "@aws-sdk/client-cognito-identity-provider";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";

const envSchema = z.object({
  USER_POOL_ID: z.string().min(1, "USER_POOL_ID is required"),
});

type Env = z.infer<typeof envSchema>;

type CheckUserExistsResponse = {
  exists: boolean;
};

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const env = envSchema.parse(process.env);

    const body = JSON.parse(event.body || "{}");
    const email = body.email;

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email is required" }),
      };
    }

    const client = new CognitoIdentityProviderClient({});

    try {
      await client.send(
        new AdminGetUserCommand({
          UserPoolId: env.USER_POOL_ID,
          Username: email,
        }),
      );

      // User exists
      const response: CheckUserExistsResponse = { exists: true };
      return {
        statusCode: 200,
        body: JSON.stringify(response),
      };
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        const response: CheckUserExistsResponse = { exists: false };
        return {
          statusCode: 200,
          body: JSON.stringify(response),
        };
      }
      throw error;
    }
  } catch (error) {
    console.error("Error checking user existence:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
