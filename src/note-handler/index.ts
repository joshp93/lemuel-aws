import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { NoteEntitySchema } from "../models/proverbStoreSchemas";
import { NoteHandlerEnvSchema } from "./schemas";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const env = NoteHandlerEnvSchema.parse(process.env);
    const uuid = event.pathParameters?.uuid;
    const ref = event.pathParameters?.ref;

    if (!uuid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "uuid path parameter is required" }),
      };
    }

    const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

    if (event.httpMethod === "GET" && !ref) {
      const limit = event.queryStringParameters?.limit
        ? parseInt(event.queryStringParameters.limit, 10)
        : undefined;

      const scanForward =
        event.queryStringParameters?.scanForward === "true";

      let exclusiveStartKey: Record<string, unknown> | undefined;
      if (event.queryStringParameters?.lastKey) {
        exclusiveStartKey = JSON.parse(
          Buffer.from(event.queryStringParameters.lastKey, "base64").toString(
            "utf-8",
          ),
        );
      }

      const result = await client.send(
        new QueryCommand({
          TableName: env.TABLE_NAME,
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: {
            ":pk": uuid,
          },
          Limit: limit,
          ExclusiveStartKey: exclusiveStartKey,
          ScanIndexForward: scanForward,
        }),
      );

      const items = (result.Items ?? []).map((item) =>
        NoteEntitySchema.parse(item),
      );

      let lastKey: string | undefined;
      if (result.LastEvaluatedKey) {
        lastKey = Buffer.from(
          JSON.stringify(result.LastEvaluatedKey),
        ).toString("base64");
      }

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ items, lastKey }),
      };
    }

    if (event.httpMethod === "GET" && ref) {
      const result = await client.send(
        new GetCommand({
          TableName: env.TABLE_NAME,
          Key: {
            pk: uuid,
            sk: ref,
          },
        }),
      );

      if (!result.Item) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Note not found" }),
        };
      }

      const entity = NoteEntitySchema.parse(result.Item);

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify(entity),
      };
    }

    if (event.httpMethod === "POST") {
      if (!ref) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "ref path parameter is required" }),
        };
      }

      const body = JSON.parse(event.body ?? "{}");
      const { note } = body;

      if (typeof note !== "string") {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "note body parameter is required" }),
        };
      }

      const entity = { pk: uuid, sk: ref, note };

      await client.send(
        new PutCommand({
          TableName: env.TABLE_NAME,
          Item: entity,
        }),
      );

      const parsed = NoteEntitySchema.parse(entity);

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify(parsed),
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (error) {
    console.error("Error in note handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};