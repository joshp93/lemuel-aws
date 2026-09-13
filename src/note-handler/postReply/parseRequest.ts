import type { APIGatewayProxyEvent } from "aws-lambda";
import { parseBody } from "../../shared/parseBody";
import type { Reply } from "./models/types";

/**
 * Parses the POST /notes/users/{uuid}/{ref}/replies request.
 * Extracts path parameters, the Cognito user's sub claim, and the request body.
 * Validation is handled by API Gateway's ReplyModel JSON schema,
 * so the body is trusted at this layer.
 *
 * @param event - The API Gateway proxy event with Cognito authorizer claims
 * @returns Parsed request fields used by the handler
 */
export const parsePostReplyRequest = (
  event: APIGatewayProxyEvent,
): {
  noteAuthorUuid: string;
  ref: string;
  userId: string;
  date: string;
  content: string;
  isUpdate: boolean;
} => {
  const noteAuthorUuid = event.pathParameters?.uuid ?? "";
  const ref = event.pathParameters?.ref ?? "";
  const claims = event.requestContext.authorizer?.claims as
    | Record<string, string>
    | undefined;
  const userId = claims?.sub ?? "";
  const body = parseBody<Reply>(event, "content");
  return {
    noteAuthorUuid,
    ref,
    userId,
    date: body.date,
    content: body.content,
    isUpdate: body.isUpdate ?? false,
  };
};
