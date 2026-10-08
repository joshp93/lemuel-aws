import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { postReplyHandler } from "../../../../src/note-handler/postReply/index";

const createDocClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}));

const ACCOUNT_KEY = { pk: "user-1", sk: "account" };
const NOTE_PK = "note#author-id#Proverbs3:5#2024-01-01";
const REPLY_SK = "reply#2024-01-01T09:00:00.000Z";

describe("postReplyHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env = { TABLE_NAME: "TestTable", FCM_SECRET_NAME: "test-fcm-secret" };

  beforeEach(() => {
    ddbMock.reset();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const makeEvent = (body?: Record<string, unknown>): APIGatewayProxyEvent =>
    ({
      pathParameters: {
        uuid: "author-id",
        ref: "Proverbs3:5",
      },
      body: JSON.stringify(
        body ?? {
          content: "Great reflection!",
          date: "2024-01-01",
        },
      ),
      requestContext: {
        authorizer: {
          claims: { sub: "user-1" },
        },
      },
    }) as unknown as APIGatewayProxyEvent;

  /**
   * Resolves account lookups and the reply lookup from a single `GetCommand`
   * stub, since both go through the same command.
   */
  const stubGets = (replyItem: Record<string, unknown> | undefined) => {
    ddbMock
      .on(GetCommand)
      .callsFake((input) =>
        input.Key?.sk === ACCOUNT_KEY.sk
          ? { Item: { ...ACCOUNT_KEY, displayName: "Alice" } }
          : { Item: replyItem },
      );
  };

  it("creates a reply and increments replyCount", async () => {
    stubGets(undefined);

    const result = await postReplyHandler(createDocClient(), env, makeEvent());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.content).toBe("Great reflection!");
    expect(body.authorUuid).toBe("user-1");
    expect(body.displayName).toBe("Alice");
    expect(body.createdAt).toBe("2024-01-01T12:00:00.000Z");
    expect(body.sk).toBe("reply#2024-01-01T12:00:00.000Z");

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(3);
    expect(putCalls[0].args[0].input.Item?.content).toBe("Great reflection!");
    expect(putCalls[2].args[0].input.Item?.pk).toBe("reply-notification");

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].args[0].input.UpdateExpression).toBe(
      "ADD replyCount :incr",
    );
  });

  it("overwrites the exact reply named by sk, leaving tracker, replyCount and notifications alone", async () => {
    stubGets({
      pk: NOTE_PK,
      sk: REPLY_SK,
      authorUuid: "user-1",
      content: "Original",
      displayName: "Alice",
      createdAt: "2024-01-01T09:00:00.000Z",
    });

    const result = await postReplyHandler(
      createDocClient(),
      env,
      makeEvent({
        content: "Updated content",
        date: "2024-01-01",
        isUpdate: true,
        sk: REPLY_SK,
      }),
    );

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.sk).toBe(REPLY_SK);
    expect(body.content).toBe("Updated content");

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].args[0].input.Item?.pk).toBe(NOTE_PK);
    expect(putCalls[0].args[0].input.Item?.sk).toBe(REPLY_SK);

    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it("keeps the reply's original createdAt rather than stamping the edit time", async () => {
    stubGets({
      pk: NOTE_PK,
      sk: REPLY_SK,
      authorUuid: "user-1",
      createdAt: "2024-01-01T09:00:00.000Z",
    });

    const result = await postReplyHandler(
      createDocClient(),
      env,
      makeEvent({
        content: "Updated content",
        date: "2024-01-01",
        isUpdate: true,
        sk: REPLY_SK,
      }),
    );

    const body = JSON.parse(result.body);
    expect(body.createdAt).toBe("2024-01-01T09:00:00.000Z");
  });

  it("edits the second of two replies without touching the first", async () => {
    const secondReplySk = "reply#2024-01-01T09:05:00.000Z";
    stubGets({
      pk: NOTE_PK,
      sk: secondReplySk,
      authorUuid: "user-1",
      createdAt: "2024-01-01T09:05:00.000Z",
    });

    await postReplyHandler(
      createDocClient(),
      env,
      makeEvent({
        content: "Third thought",
        date: "2024-01-01",
        isUpdate: true,
        sk: secondReplySk,
      }),
    );

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].args[0].input.Item?.sk).toBe(secondReplySk);
  });

  it("derives the note partition key from the path, ignoring any pk in the body", async () => {
    stubGets({
      pk: NOTE_PK,
      sk: REPLY_SK,
      authorUuid: "user-1",
      createdAt: "2024-01-01T09:00:00.000Z",
    });

    await postReplyHandler(
      createDocClient(),
      env,
      makeEvent({
        content: "Updated content",
        date: "2024-01-01",
        isUpdate: true,
        sk: REPLY_SK,
        pk: "victim-id",
      }),
    );

    const [getCall] = ddbMock.commandCalls(GetCommand);
    expect(getCall.args[0].input.Key).toEqual({ pk: NOTE_PK, sk: REPLY_SK });

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls[0].args[0].input.Item?.pk).toBe(NOTE_PK);
  });

  it("returns 400 when an update arrives without a sort key", async () => {
    stubGets(undefined);

    const result = await postReplyHandler(
      createDocClient(),
      env,
      makeEvent({
        content: "Updated content",
        date: "2024-01-01",
        isUpdate: true,
      }),
    );

    expect(result.statusCode).toBe(400);
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
  });

  it("returns 400 and reads nothing when the sort key is not a reply key", async () => {
    stubGets({ pk: NOTE_PK, sk: "Proverbs3:5#2024-01-01" });

    const result = await postReplyHandler(
      createDocClient(),
      env,
      makeEvent({
        content: "Updated content",
        date: "2024-01-01",
        isUpdate: true,
        sk: "Proverbs3:5#2024-01-01",
      }),
    );

    expect(result.statusCode).toBe(400);
    expect(ddbMock.commandCalls(GetCommand)).toHaveLength(0);
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
  });

  it("returns 404 when the reply being edited does not exist", async () => {
    stubGets(undefined);

    const result = await postReplyHandler(
      createDocClient(),
      env,
      makeEvent({
        content: "Updated content",
        date: "2024-01-01",
        isUpdate: true,
        sk: REPLY_SK,
      }),
    );

    expect(result.statusCode).toBe(404);
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
  });

  it("returns 403 when the reply being edited belongs to someone else", async () => {
    stubGets({
      pk: NOTE_PK,
      sk: REPLY_SK,
      authorUuid: "user-2",
      createdAt: "2024-01-01T09:00:00.000Z",
    });

    const result = await postReplyHandler(
      createDocClient(),
      env,
      makeEvent({
        content: "Updated content",
        date: "2024-01-01",
        isUpdate: true,
        sk: REPLY_SK,
      }),
    );

    expect(result.statusCode).toBe(403);
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
  });

  it("returns 401 when userId is missing", async () => {
    const event = {
      pathParameters: { uuid: "author-id", ref: "Proverbs3:5" },
      body: JSON.stringify({ content: "test", date: "2024-01-01" }),
      requestContext: { authorizer: { claims: {} } },
    } as unknown as APIGatewayProxyEvent;

    const result = await postReplyHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(401);
  });

  it("returns 500 on error", async () => {
    ddbMock.on(GetCommand).rejects(new Error("DynamoDB failure"));

    const result = await postReplyHandler(createDocClient(), env, makeEvent());

    expect(result.statusCode).toBe(500);
  });
});
