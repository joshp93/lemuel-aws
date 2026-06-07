import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { JWT } from "google-auth-library";
import { z } from "zod";

/** Schema for the FCM service account JSON stored in Secrets Manager. */
export const FirebasePrivateKeySchema = z.object({
  type: z.string(),
  project_id: z.string(),
  private_key_id: z.string(),
  private_key: z.string(),
  client_email: z.string(),
  client_id: z.string(),
  auth_uri: z.string(),
  token_uri: z.string(),
  auth_provider_x509_cert_url: z.string(),
  client_x509_cert_url: z.string(),
  universe_domain: z.string(),
});

/** Parsed FCM service account credential with project_id extracted from the secret. */
export type FcmCredentials = z.infer<typeof FirebasePrivateKeySchema>;

/** Reads FCM server credentials from AWS Secrets Manager and returns the parsed service account JSON
 *  validated against FirebasePrivateKeySchema. */
export const getFcmCreds = async (
  secretName: string,
): Promise<FcmCredentials> => {
  const client = new SecretsManagerClient({});
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName }),
  );
  return FirebasePrivateKeySchema.parse(JSON.parse(response.SecretString!));
};

/** Uses google-auth-library JWT client to obtain an OAuth2 access token
 *  for the Firebase Cloud Messaging scope. */
export const getAccessToken = async (
  credentials: FcmCredentials,
): Promise<string | null | undefined> => {
  const jwt = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const tokenResponse = await jwt.getAccessToken();
  return tokenResponse.token;
};

/** Sends a single FCM message to a specific device token via the v1 Firebase Messaging API.
 *  Requires a valid access token from the caller to avoid repeated auth per message. */
export const sendFcmMessage = async (
  token: string,
  message: object,
  projectId: string,
  accessToken: string,
): Promise<void> => {
  await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token,
          ...message,
        },
      }),
    },
  );
};

/** Reads FCM credentials and access token once, then splits tokens into sequential
 *  batches of `batchSize` (default 100) and sends all messages in a batch concurrently
 *  via Promise.allSettled. */
export const sendToAllTokens = async (
  tokens: string[],
  message: object,
  secretName: string,
  batchSize = 100,
): Promise<void> => {
  const credentials = await getFcmCreds(secretName);
  const accessToken = await getAccessToken(credentials);
  if (!accessToken) {
    throw new Error("Failed to obtain FCM access token");
  }

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map((token) =>
        sendFcmMessage(token, message, credentials.project_id, accessToken),
      ),
    );
  }
};
