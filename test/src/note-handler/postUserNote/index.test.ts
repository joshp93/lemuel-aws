import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { postUserNoteHandler } from "../../../../src/note-handler/postUserNote/index";
import { authenticatedEvent } from "../../../helpers/authenticatedEvent";

const createDocClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}));

const UUID = "66a20224-c0d1-70f3-58f9-4671e44cac10";
const NOTE_KEY = { pk: UUID, sk: "Proverbs3:5#2024-01-01" };

const noteAttributes = (overrides: Record<string, unknown> = {}) => ({
  pk: UUID,
  sk: "Proverbs3:5#2024-01-01",
  note: "Trust in the Lord",
  dateCreated: "2024-01-01T12:00:00.000Z",
  date: "2024-01-01",
  uuid: UUID,
  ref: "Proverbs3:5",
  isPrivate: false,
  reactionCounts: { "🙏": 2 },
  replyCount: 3,
  ...overrides,
});

describe("postUserNoteHandler", () => {
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

  const makeEvent = (
    overrides: Partial<{
      uuid: string;
      body: Record<string, unknown>;
      sub: string;
    }> = {},
  ) =>
    authenticatedEvent(overrides.sub ?? UUID, {
      pathParameters: {
        uuid: overrides.uuid ?? UUID,
        ref: "Proverbs3:5",
      },
      body: JSON.stringify(
        overrides.body ?? { note: "Trust in the Lord", date: "2024-01-01" },
      ),
    });

  it("updates the note content without touching reactions or replies", async () => {
    ddbMock
      .on(UpdateCommand, { TableName: "TestTable", Key: NOTE_KEY })
      .resolves({ Attributes: noteAttributes() });
    ddbMock.on(QueryCommand).resolves({ Count: 5 });
    ddbMock
      .on(UpdateCommand, {
        TableName: "TestTable",
        Key: { pk: UUID, sk: "account" },
      })
      .resolves({});

    const result = await postUserNoteHandler(
      createDocClient(),
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toMatchObject({
      pk: UUID,
      sk: "Proverbs3:5#2024-01-01",
      note: "Trust in the Lord",
      uuid: UUID,
      ref: "Proverbs3:5",
      date: "2024-01-01",
      dateCreated: "2024-01-01T12:00:00.000Z",
      isPrivate: false,
      reactionCounts: { "🙏": 2 },
      replyCount: 3,
    });

    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);

    const noteUpdate = ddbMock.commandCalls(UpdateCommand, {
      TableName: "TestTable",
      Key: NOTE_KEY,
    })[0].args[0].input;
    expect(noteUpdate.UpdateExpression).not.toContain("reactionCounts");
    expect(noteUpdate.UpdateExpression).not.toContain("replyCount");
    expect(noteUpdate.ConditionExpression).toBe(
      "attribute_not_exists(#pk) OR attribute_not_exists(#uuid) OR #uuid = :uuid",
    );

    const queryCalls = ddbMock.commandCalls(QueryCommand);
    expect(queryCalls).toHaveLength(1);
    expect(queryCalls[0].args[0].input.IndexName).toBe("user-notes-index");
    expect(queryCalls[0].args[0].input.ExpressionAttributeValues).toEqual({
      ":uid": UUID,
    });
    expect(queryCalls[0].args[0].input.Select).toBe("COUNT");

    const accountUpdate = ddbMock.commandCalls(UpdateCommand, {
      TableName: "TestTable",
      Key: { pk: UUID, sk: "account" },
    })[0].args[0].input;
    expect(accountUpdate.UpdateExpression).toBe("SET totalNotes = :count");
    expect(accountUpdate.ExpressionAttributeValues).toEqual({ ":count": 5 });
  });

  it("returns 401 when the request is unauthenticated", async () => {
    const event = {
      pathParameters: { uuid: UUID, ref: "Proverbs3:5" },
      body: JSON.stringify({ note: "note", date: "2024-01-01" }),
    } as unknown as Parameters<typeof postUserNoteHandler>[2];

    const result = await postUserNoteHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(401);
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it("returns 403 when the path uuid belongs to another user", async () => {
    const result = await postUserNoteHandler(
      createDocClient(),
      env,
      makeEvent({ uuid: "someone-else" }),
    );

    expect(result.statusCode).toBe(403);
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it("returns 403 when the existing item belongs to another user", async () => {
    const conditionError = new Error("conditional check failed");
    conditionError.name = "ConditionalCheckFailedException";
    ddbMock
      .on(UpdateCommand, { TableName: "TestTable", Key: NOTE_KEY })
      .rejects(conditionError);

    const result = await postUserNoteHandler(
      createDocClient(),
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(403);
  });

  it("returns 500 when body is empty", async () => {
    const event = authenticatedEvent(UUID, {
      pathParameters: { uuid: UUID, ref: "Proverbs3:5" },
      body: "{}",
    });

    const result = await postUserNoteHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(500);
  });

  it("sets totalNotes to 0 when Query returns undefined Count", async () => {
    ddbMock
      .on(UpdateCommand, { TableName: "TestTable", Key: NOTE_KEY })
      .resolves({ Attributes: noteAttributes({ note: "Trust" }) });
    ddbMock.on(QueryCommand).resolves({ Count: undefined });
    ddbMock
      .on(UpdateCommand, {
        TableName: "TestTable",
        Key: { pk: UUID, sk: "account" },
      })
      .resolves({});

    const result = await postUserNoteHandler(
      createDocClient(),
      env,
      makeEvent({ body: { note: "Trust", date: "2024-01-01" } }),
    );

    expect(result.statusCode).toBe(200);

    const accountUpdate = ddbMock.commandCalls(UpdateCommand, {
      TableName: "TestTable",
      Key: { pk: UUID, sk: "account" },
    })[0].args[0].input;
    expect(accountUpdate.ExpressionAttributeValues).toEqual({ ":count": 0 });
  });

  it("stores isPrivate when saving a private note", async () => {
    ddbMock
      .on(UpdateCommand, { TableName: "TestTable", Key: NOTE_KEY })
      .resolves({ Attributes: noteAttributes({ isPrivate: true }) });
    ddbMock.on(QueryCommand).resolves({ Count: 1 });
    ddbMock
      .on(UpdateCommand, {
        TableName: "TestTable",
        Key: { pk: UUID, sk: "account" },
      })
      .resolves({});

    const result = await postUserNoteHandler(
      createDocClient(),
      env,
      makeEvent({
        body: {
          note: "Private thoughts",
          date: "2024-01-01",
          isPrivate: true,
        },
      }),
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).isPrivate).toBe(true);
  });

  it("returns 500 on DynamoDB error", async () => {
    ddbMock
      .on(UpdateCommand, { TableName: "TestTable", Key: NOTE_KEY })
      .rejects(new Error("DynamoDB failure"));

    const result = await postUserNoteHandler(
      createDocClient(),
      env,
      makeEvent({ body: { note: "my note", date: "2024-01-01" } }),
    );

    expect(result.statusCode).toBe(500);
  });
});
