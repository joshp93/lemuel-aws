import type { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../../../src/note-handler/index";

jest.mock("../../../src/note-handler/getProverbNotes/index", () => ({
  getProverbNotesHandler: jest.fn().mockResolvedValue({
    statusCode: 200,
    body: JSON.stringify({ items: [], lastKey: undefined }),
  }),
}));

jest.mock("../../../src/note-handler/getUserNote/index", () => ({
  getUserNoteHandler: jest.fn().mockResolvedValue({
    statusCode: 200,
    body: JSON.stringify({ pk: "uuid", sk: "ref", note: "test" }),
  }),
}));

jest.mock("../../../src/note-handler/getUserNotes/index", () => ({
  getUserNotesHandler: jest.fn().mockResolvedValue({
    statusCode: 200,
    body: JSON.stringify({ items: [], lastKey: undefined }),
  }),
}));

jest.mock("../../../src/note-handler/postUserNote/index", () => ({
  postUserNoteHandler: jest.fn().mockResolvedValue({
    statusCode: 200,
    body: JSON.stringify({ pk: "uuid", sk: "ref", note: "test" }),
  }),
}));

jest.mock("../../../src/note-handler/putReaction/index", () => ({
  putReactionHandler: jest.fn().mockResolvedValue({
    statusCode: 200,
    body: JSON.stringify({}),
  }),
}));

jest.mock("../../../src/note-handler/deleteReaction/index", () => ({
  deleteReactionHandler: jest.fn().mockResolvedValue({
    statusCode: 200,
    body: JSON.stringify({}),
  }),
}));

jest.mock("../../../src/note-handler/getReactions/index", () => ({
  getReactionsHandler: jest.fn().mockResolvedValue({
    statusCode: 200,
    body: JSON.stringify({ reactionCounts: {}, reactions: [] }),
  }),
}));

jest.mock("../../../src/note-handler/postReply/index", () => ({
  postReplyHandler: jest.fn().mockResolvedValue({
    statusCode: 200,
    body: JSON.stringify({}),
  }),
}));

jest.mock("../../../src/note-handler/getReplies/index", () => ({
  getRepliesHandler: jest.fn().mockResolvedValue({
    statusCode: 200,
    body: JSON.stringify({ items: [] }),
  }),
}));

jest.mock("../../../src/note-handler/deleteReply/index", () => ({
  deleteReplyHandler: jest.fn().mockResolvedValue({
    statusCode: 200,
    body: JSON.stringify({}),
  }),
}));

import { deleteReactionHandler } from "../../../src/note-handler/deleteReaction/index";
import { deleteReplyHandler } from "../../../src/note-handler/deleteReply/index";
import { getProverbNotesHandler } from "../../../src/note-handler/getProverbNotes/index";
import { getReactionsHandler } from "../../../src/note-handler/getReactions/index";
import { getRepliesHandler } from "../../../src/note-handler/getReplies/index";
import { getUserNoteHandler } from "../../../src/note-handler/getUserNote/index";
import { getUserNotesHandler } from "../../../src/note-handler/getUserNotes/index";
import { postReplyHandler } from "../../../src/note-handler/postReply/index";
import { postUserNoteHandler } from "../../../src/note-handler/postUserNote/index";
import { putReactionHandler } from "../../../src/note-handler/putReaction/index";

describe("note-handler router", () => {
  beforeEach(() => {
    process.env.TABLE_NAME = "TestTable";
    process.env.FCM_SECRET_NAME = "test-fcm-secret";
    jest.clearAllMocks();
  });

  it("routes GET /notes/proverbs/{ref} to getProverbNotesHandler", async () => {
    const event = {
      httpMethod: "GET",
      resource: "/notes/proverbs/{ref}",
      pathParameters: { ref: "Proverbs3:5" },
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    expect(getProverbNotesHandler).toHaveBeenCalled();
  });

  it("routes GET /notes/users/{uuid} to getUserNotesHandler", async () => {
    const event = {
      httpMethod: "GET",
      resource: "/notes/users/{uuid}",
      pathParameters: { uuid: "user-123" },
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    expect(getUserNotesHandler).toHaveBeenCalled();
  });

  it("routes GET /notes/users/{uuid}/{ref} to getUserNoteHandler", async () => {
    const event = {
      httpMethod: "GET",
      resource: "/notes/users/{uuid}/{ref}",
      pathParameters: { uuid: "user-123", ref: "Proverbs3:5" },
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    expect(getUserNoteHandler).toHaveBeenCalled();
  });

  it("routes POST /notes/users/{uuid}/{ref} to postUserNoteHandler", async () => {
    const event = {
      httpMethod: "POST",
      resource: "/notes/users/{uuid}/{ref}",
      pathParameters: { uuid: "user-123", ref: "Proverbs3:5" },
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    expect(postUserNoteHandler).toHaveBeenCalled();
  });

  it("returns 405 for unsupported routes", async () => {
    const event = {
      httpMethod: "DELETE",
      resource: "/notes/users/{uuid}",
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(405);
    expect(JSON.parse(result.body)).toEqual({ error: "Method not allowed" });
  });

  it("routes PUT /notes/users/{uuid}/{ref}/reactions to putReactionHandler", async () => {
    const event = {
      httpMethod: "PUT",
      resource: "/notes/users/{uuid}/{ref}/reactions",
      pathParameters: { uuid: "user-123", ref: "Proverbs3:5" },
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    expect(putReactionHandler).toHaveBeenCalled();
  });

  it("routes DELETE /notes/users/{uuid}/{ref}/reactions to deleteReactionHandler", async () => {
    const event = {
      httpMethod: "DELETE",
      resource: "/notes/users/{uuid}/{ref}/reactions",
      pathParameters: { uuid: "user-123", ref: "Proverbs3:5" },
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    expect(deleteReactionHandler).toHaveBeenCalled();
  });

  it("routes GET /notes/users/{uuid}/{ref}/reactions to getReactionsHandler", async () => {
    const event = {
      httpMethod: "GET",
      resource: "/notes/users/{uuid}/{ref}/reactions",
      pathParameters: { uuid: "user-123", ref: "Proverbs3:5" },
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    expect(getReactionsHandler).toHaveBeenCalled();
  });

  it("routes POST /notes/users/{uuid}/{ref}/replies to postReplyHandler", async () => {
    const event = {
      httpMethod: "POST",
      resource: "/notes/users/{uuid}/{ref}/replies",
      pathParameters: { uuid: "user-123", ref: "Proverbs3:5" },
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    expect(postReplyHandler).toHaveBeenCalled();
  });

  it("routes GET /notes/users/{uuid}/{ref}/replies to getRepliesHandler", async () => {
    const event = {
      httpMethod: "GET",
      resource: "/notes/users/{uuid}/{ref}/replies",
      pathParameters: { uuid: "user-123", ref: "Proverbs3:5" },
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    expect(getRepliesHandler).toHaveBeenCalled();
  });

  it("routes DELETE /notes/users/{uuid}/{ref}/replies to deleteReplyHandler", async () => {
    const event = {
      httpMethod: "DELETE",
      resource: "/notes/users/{uuid}/{ref}/replies",
      pathParameters: { uuid: "user-123", ref: "Proverbs3:5" },
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    expect(deleteReplyHandler).toHaveBeenCalled();
  });

  it("returns 500 when env var is missing", async () => {
    delete process.env.TABLE_NAME;

    const event = {
      httpMethod: "GET",
      resource: "/notes/proverbs/{ref}",
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
  });
});
