import { APIGatewayProxyEvent } from "aws-lambda";
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

import { getProverbNotesHandler } from "../../../src/note-handler/getProverbNotes/index";
import { getUserNoteHandler } from "../../../src/note-handler/getUserNote/index";
import { getUserNotesHandler } from "../../../src/note-handler/getUserNotes/index";
import { postUserNoteHandler } from "../../../src/note-handler/postUserNote/index";

describe("note-handler router", () => {
  beforeEach(() => {
    process.env.TABLE_NAME = "TestTable";
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