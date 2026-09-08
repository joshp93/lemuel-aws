import type { APIGatewayProxyEvent } from "aws-lambda";
import { parseBody } from "../../shared/parseBody";
import type { Reaction } from "./models/types";

/**
 * Parses the PUT /notes/users/{uuid}/{ref}/reactions request.
 * Extracts path parameters, the Cognito user's sub claim, and the request body.
 * Validation is handled by API Gateway's ReactionModel JSON schema,
 * so the body is trusted at this layer.
 *
 * @param event - The API Gateway proxy event with Cognito authorizer claims
 * @returns Parsed request fields used by the handler
 */
export const parsePutReactionRequest = (
  event: APIGatewayProxyEvent,
): {
  noteAuthorUuid: string;
  ref: string;
  userId: string;
  date: string;
  reactionType: string;
} => {
  const noteAuthorUuid = event.pathParameters?.uuid ?? "";
  const ref = event.pathParameters?.ref ?? "";
  const claims = event.requestContext.authorizer?.claims as
    | Record<string, string>
    | undefined;
  const userId = claims?.sub ?? "";
  const body = parseBody<Reaction>(event, "reactionType");
  return {
    noteAuthorUuid,
    ref,
    userId,
    date: body.date,
    reactionType: body.reactionType,
  };
};
