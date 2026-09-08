import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  BatchWriteCommand,
  type DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { AccountHandlerEnv } from "../models";

const cognitoClient = new CognitoIdentityProviderClient({});

/**
 * Parses a reaction tracker sk to extract the note composite key parts.
 * Format: "reaction-tracker#{noteAuthorUuid}#{ref}#{date}"
 */
const parseReactionTracker = (
  sk: string,
): { noteAuthorUuid: string; ref: string; date: string } | null => {
  const parts = sk.replace("reaction-tracker#", "").split("#");
  if (parts.length < 3) return null;
  const [noteAuthorUuid, ...refAndDate] = parts;
  const date = refAndDate.pop() ?? "";
  const ref = refAndDate.join("#");
  return { noteAuthorUuid, ref, date };
};

/**
 * Parses a reply tracker sk to extract the note composite key parts and the reply sk.
 * Format: "reply-tracker#{noteAuthorUuid}#{ref}#{date}#{replySk}"
 */
const parseReplyTracker = (
  sk: string,
): {
  noteAuthorUuid: string;
  ref: string;
  date: string;
  replySk: string;
} | null => {
  const parts = sk.replace("reply-tracker#", "").split("#");
  if (parts.length < 3) return null;
  const [noteAuthorUuid, ...rest] = parts;
  const replySk = rest.pop() ?? "";
  const date = rest.pop() ?? "";
  const ref = rest.join("#");
  return { noteAuthorUuid, ref, date, replySk };
};

/**
 * Recomputes the reactionCounts for a note by querying all remaining reactions.
 *
 * @param client - DynamoDBDocumentClient
 * @param tableName - The DynamoDB table name
 * @param notePk - The composite pk of the parent note
 * @param noteAuthorUuid - The note author's UUID (the note's own pk)
 * @param ref - The proverb reference
 * @param date - The proverb date
 */
const recomputeReactionCounts = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  notePk: string,
  noteAuthorUuid: string,
  ref: string,
  date: string,
): Promise<void> => {
  const remaining = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: { ":pk": notePk, ":prefix": "reaction" },
    }),
  );

  const newCounts: Record<string, number> = {};
  for (const item of remaining.Items ?? []) {
    const emoji = item.reactionType as string;
    newCounts[emoji] = (newCounts[emoji] ?? 0) + 1;
  }

  await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk: noteAuthorUuid, sk: `${ref}#${date}` },
      UpdateExpression: "SET reactionCounts = :counts",
      ExpressionAttributeValues: { ":counts": newCounts },
    }),
  );
};

/**
 * Recomputes the replyCount for a note by querying all remaining replies.
 *
 * @param client - DynamoDBDocumentClient
 * @param tableName - The DynamoDB table name
 * @param notePk - The composite pk of the parent note
 * @param noteAuthorUuid - The note author's UUID (the note's own pk)
 * @param ref - The proverb reference
 * @param date - The proverb date
 */
const recomputeReplyCount = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  notePk: string,
  noteAuthorUuid: string,
  ref: string,
  date: string,
): Promise<void> => {
  const remaining = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: { ":pk": notePk, ":prefix": "reply" },
      Select: "COUNT",
    }),
  );

  await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk: noteAuthorUuid, sk: `${ref}#${date}` },
      UpdateExpression: "SET replyCount = :count",
      ExpressionAttributeValues: { ":count": remaining.Count ?? 0 },
    }),
  );
};

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

    const reactionTrackers = await client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: {
          ":pk": uuid,
          ":prefix": "reaction-tracker#",
        },
      }),
    );

    const replyTrackers = await client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: {
          ":pk": uuid,
          ":prefix": "reply-tracker#",
        },
      }),
    );

    const affectedNotes = new Map<
      string,
      {
        noteAuthorUuid: string;
        ref: string;
        date: string;
        notePk: string;
        hasReaction: boolean;
        hasReply: boolean;
      }
    >();

    for (const tracker of reactionTrackers.Items ?? []) {
      const sk = tracker.sk as string;
      const parsed = parseReactionTracker(sk);
      if (!parsed) continue;

      const { noteAuthorUuid, ref, date } = parsed;
      const notePk = `note#${noteAuthorUuid}#${ref}#${date}`;

      deleteRequests.push({
        DeleteRequest: { Key: { pk: uuid, sk } },
      });
      deleteRequests.push({
        DeleteRequest: { Key: { pk: notePk, sk: `reaction#${uuid}` } },
      });

      const key = `${noteAuthorUuid}#${ref}#${date}`;
      const existing = affectedNotes.get(key);
      if (existing) {
        existing.hasReaction = true;
      } else {
        affectedNotes.set(key, {
          noteAuthorUuid,
          ref,
          date,
          notePk,
          hasReaction: true,
          hasReply: false,
        });
      }
    }

    for (const tracker of replyTrackers.Items ?? []) {
      const sk = tracker.sk as string;
      const parsed = parseReplyTracker(sk);
      if (!parsed) continue;

      const { noteAuthorUuid, ref, date, replySk } = parsed;
      const notePk = `note#${noteAuthorUuid}#${ref}#${date}`;

      deleteRequests.push({
        DeleteRequest: { Key: { pk: uuid, sk } },
      });
      deleteRequests.push({
        DeleteRequest: { Key: { pk: notePk, sk: replySk } },
      });

      const key = `${noteAuthorUuid}#${ref}#${date}`;
      const existing = affectedNotes.get(key);
      if (existing) {
        existing.hasReply = true;
      } else {
        affectedNotes.set(key, {
          noteAuthorUuid,
          ref,
          date,
          notePk,
          hasReaction: false,
          hasReply: true,
        });
      }
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

    for (const {
      noteAuthorUuid,
      ref,
      date,
      notePk,
      hasReaction,
      hasReply,
    } of affectedNotes.values()) {
      if (hasReaction) {
        await recomputeReactionCounts(
          client,
          tableName,
          notePk,
          noteAuthorUuid,
          ref,
          date,
        );
      }
      if (hasReply) {
        await recomputeReplyCount(
          client,
          tableName,
          notePk,
          noteAuthorUuid,
          ref,
          date,
        );
      }
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
