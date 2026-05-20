import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { Secret } from "../types";

/**
 * Retrieves the API.Bible credentials from AWS Secrets Manager.
 * @param secretName - The name/ARN of the secret containing apiKey and baseUrl
 * @returns The parsed secret containing apiKey and baseUrl
 * @throws Error if the secret name is not set or the secret value is empty
 */
export const getSecret = async (secretName: string): Promise<Secret> => {
  if (!secretName) {
    throw new Error("API_BIBLE_SECRET_NAME environment variable not set");
  }

  const secretsClient = new SecretsManagerClient({});
  const secretResponse = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretName }),
  );

  if (!secretResponse.SecretString) {
    throw new Error("Secret value is empty");
  }

  return JSON.parse(secretResponse.SecretString) as Secret;
};