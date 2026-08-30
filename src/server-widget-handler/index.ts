import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getWidgetHandler } from "./getWidgetHandler";

/**
 * API Gateway handler for the Voltra server-driven widget endpoint.
 *
 * Receives GET requests from the Voltra WorkManager background worker
 * (see {@link https://www.use-voltra.dev/v1/android/development/server-driven-widgets}),
 * constructs a Fetch {@link Request} from the API Gateway event, and delegates
 * to the Voltra widget server handler for authentication, rendering, and
 * serialisation.
 */
export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const handler = await getWidgetHandler();

  const qs = event.queryStringParameters ?? {};
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(qs)) {
    params.append(key, value!);
  }
  const queryString = params.toString();
  const url = `https://widget.lemuel.app${event.path}${queryString ? `?${queryString}` : ""}`;

  const request = new Request(url, {
    method: event.httpMethod,
    headers: new Headers((event.headers ?? {}) as Record<string, string>),
  });

  const response = await handler(request);
  const body = await response.text();

  return {
    statusCode: response.status,
    body,
    headers: {
      "Content-Type": "application/json",
    },
  };
};
