import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import type { WidgetUpdateHandler } from "@use-voltra/android-server";
import { createAndroidWidgetUpdateHandler } from "@use-voltra/android-server";
import { renderProverbWidget } from "./proverbWidget";

let widgetHandler: WidgetUpdateHandler | null = null;
let cachedSecret: string | null = null;

/**
 * Lazily initialises the Voltra widget server handler, reading the shared
 * HMAC secret from Secrets Manager for token validation. The handler and
 * secret are cached at module scope for reuse across warm Lambda invocations.
 */
export const getWidgetHandler = async (): Promise<WidgetUpdateHandler> => {
  if (widgetHandler) return widgetHandler;

  if (!cachedSecret) {
    const secretsClient = new SecretsManagerClient({});
    const result = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: process.env.WIDGET_SERVER_SECRET_NAME!,
      }),
    );
    cachedSecret = result.SecretString ?? "";
    secretsClient.destroy();
  }

  widgetHandler = createAndroidWidgetUpdateHandler({
    render: renderProverbWidget,
    validateToken: (token: string): boolean => token === cachedSecret,
  });

  return widgetHandler;
};
