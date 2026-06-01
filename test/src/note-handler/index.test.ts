import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { handler } from "../../../src/note-handler/index";

describe("note-handler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.resetHistory();
    process.env.TABLE_NAME = "TestTable";
  });

  describe("GET /notes/{uuid} — list notes", () => {
    it("returns paginated notes for a user", async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          { pk: "user-123", sk: "Proverbs1:1", note: "my note 1" },
          { pk: "user-123", sk: "Proverbs1:2", note: "my note 2" },
        ],
      });

      const event = {
        httpMethod: "GET",
        pathParameters: { uuid: "user-123" },
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.items).toHaveLength(2);
      expect(body.items[0]).toEqual({
        pk: "user-123",
        sk: "Proverbs1:1",
        note: "my note 1",
      });
      expect(body.lastKey).toBeUndefined();

      const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
      expect(queryCall.KeyConditionExpression).toBe("pk = :pk");
      expect(queryCall.ExpressionAttributeValues![":pk"]).toBe("user-123");
    });

    it("defaults to scanForward=false (newest first)", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const event = {
        httpMethod: "GET",
        pathParameters: { uuid: "user-123" },
      } as unknown as APIGatewayProxyEvent;
      await handler(event);

      const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
      expect(queryCall.ScanIndexForward).toBe(false);
    });

    it("accepts scanForward=true query param", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const event = {
        httpMethod: "GET",
        pathParameters: { uuid: "user-123" },
        queryStringParameters: { scanForward: "true" },
      } as unknown as APIGatewayProxyEvent;
      await handler(event);

      const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
      expect(queryCall.ScanIndexForward).toBe(true);
    });

    it("passes limit from query param", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const event = {
        httpMethod: "GET",
        pathParameters: { uuid: "user-123" },
        queryStringParameters: { limit: "5" },
      } as unknown as APIGatewayProxyEvent;
      await handler(event);

      const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
      expect(queryCall.Limit).toBe(5);
    });

    it("passes lastKey from query param as ExclusiveStartKey", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const exclusiveStartKey = { pk: "user-123", sk: "Proverbs10:1" };
      const lastKey = Buffer.from(JSON.stringify(exclusiveStartKey)).toString(
        "base64",
      );

      const event = {
        httpMethod: "GET",
        pathParameters: { uuid: "user-123" },
        queryStringParameters: { lastKey },
      } as unknown as APIGatewayProxyEvent;
      await handler(event);

      const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
      expect(queryCall.ExclusiveStartKey).toEqual(exclusiveStartKey);
    });

    it("returns lastKey when LastEvaluatedKey is present", async () => {
      const lastEvaluatedKey = { pk: "user-123", sk: "Proverbs10:1" };
      ddbMock.on(QueryCommand).resolves({
        Items: [{ pk: "user-123", sk: "Proverbs1:1", note: "my note" }],
        LastEvaluatedKey: lastEvaluatedKey,
      });

      const event = {
        httpMethod: "GET",
        pathParameters: { uuid: "user-123" },
      } as unknown as APIGatewayProxyEvent;
      const result = await handler(event);

      const body = JSON.parse(result.body);
      expect(body.lastKey).toBe(
        Buffer.from(JSON.stringify(lastEvaluatedKey)).toString("base64"),
      );
    });

    it("returns empty items array when no notes exist", async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const event = {
        httpMethod: "GET",
        pathParameters: { uuid: "user-123" },
      } as unknown as APIGatewayProxyEvent;
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.items).toEqual([]);
    });
  });

  describe("GET /notes/{uuid}/{ref} — get single note", () => {
    it("returns the note when found", async () => {
      const mockItem = {
        pk: "user-123",
        sk: "Proverbs1:1",
        note: "my note",
      };
      ddbMock
        .on(GetCommand, {
          TableName: "TestTable",
          Key: { pk: "user-123", sk: "Proverbs1:1" },
        })
        .resolves({ Item: mockItem });

      const event = {
        httpMethod: "GET",
        pathParameters: { uuid: "user-123", ref: "Proverbs1:1" },
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockItem);
    });

    it("returns 404 when note is not found", async () => {
      ddbMock
        .on(GetCommand, {
          TableName: "TestTable",
          Key: { pk: "user-123", sk: "Proverbs1:1" },
        })
        .resolves({ Item: undefined });

      const event = {
        httpMethod: "GET",
        pathParameters: { uuid: "user-123", ref: "Proverbs1:1" },
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({ error: "Note not found" });
    });
  });

  describe("POST /notes/{uuid}/{ref} — create/update note", () => {
    it("creates a note and returns it", async () => {
      ddbMock.on(PutCommand).resolves({});

      const event = {
        httpMethod: "POST",
        pathParameters: { uuid: "user-123", ref: "Proverbs3:5" },
        body: JSON.stringify({ note: "Trust in the Lord" }),
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        pk: "user-123",
        sk: "Proverbs3:5",
        note: "Trust in the Lord",
      });

      const putCalls = ddbMock.commandCalls(PutCommand);
      expect(putCalls).toHaveLength(1);
      expect(putCalls[0].args[0].input.Item).toEqual({
        pk: "user-123",
        sk: "Proverbs3:5",
        note: "Trust in the Lord",
      });
    });

    it("updates an existing note", async () => {
      ddbMock.on(PutCommand).resolves({});

      const event = {
        httpMethod: "POST",
        pathParameters: { uuid: "user-123", ref: "Proverbs3:5" },
        body: JSON.stringify({ note: "Updated note" }),
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        pk: "user-123",
        sk: "Proverbs3:5",
        note: "Updated note",
      });
    });

    it("returns 400 when body is empty", async () => {
      const event = {
        httpMethod: "POST",
        pathParameters: { uuid: "user-123", ref: "Proverbs3:5" },
        body: "{}",
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "note body parameter is required",
      });
    });

    it("returns 400 when ref is missing", async () => {
      const event = {
        httpMethod: "POST",
        pathParameters: { uuid: "user-123" },
        body: JSON.stringify({ note: "my note" }),
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "ref path parameter is required",
      });
    });
  });

  describe("error handling", () => {
    it("returns 400 when uuid is missing", async () => {
      const event = {
        httpMethod: "GET",
        pathParameters: {},
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "uuid path parameter is required",
      });
    });

    it("returns 400 when pathParameters is undefined", async () => {
      const event = { httpMethod: "GET" } as unknown as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "uuid path parameter is required",
      });
    });

    it("returns 405 for unsupported HTTP methods", async () => {
      const event = {
        httpMethod: "DELETE",
        pathParameters: { uuid: "user-123" },
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(405);
      expect(JSON.parse(result.body)).toEqual({
        error: "Method not allowed",
      });
    });

    it("returns 500 when DynamoDB throws an error", async () => {
      ddbMock.on(GetCommand).rejects(new Error("DynamoDB failure"));

      const event = {
        httpMethod: "GET",
        pathParameters: { uuid: "user-123", ref: "Proverbs1:1" },
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: "Internal server error",
      });
    });

    it("returns 500 when DynamoDB query throws an error", async () => {
      ddbMock.on(QueryCommand).rejects(new Error("DynamoDB failure"));

      const event = {
        httpMethod: "GET",
        pathParameters: { uuid: "user-123" },
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: "Internal server error",
      });
    });

    it("returns 500 when DynamoDB put throws an error", async () => {
      ddbMock.on(PutCommand).rejects(new Error("DynamoDB failure"));

      const event = {
        httpMethod: "POST",
        pathParameters: { uuid: "user-123", ref: "Proverbs3:5" },
        body: JSON.stringify({ note: "my note" }),
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: "Internal server error",
      });
    });

    it("returns 500 when TABLE_NAME env var is missing", async () => {
      delete process.env.TABLE_NAME;

      const event = {
        httpMethod: "GET",
        pathParameters: { uuid: "user-123" },
      } as unknown as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });
  });
});