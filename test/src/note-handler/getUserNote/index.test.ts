import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { getUserNoteHandler } from "../../../../src/note-handler/getUserNote/index";

const createDocClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}));

describe("getUserNoteHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env = { TABLE_NAME: "TestTable" };

  beforeEach(() => {
    ddbMock.reset();
  });

  it("returns the note when found", async () => {
    const mockItem = {
      pk: "66a20224-c0d1-70f3-58f9-4671e44cac10",
      sk: "Proverbs1:1",
      note: "my note",
      dateCreated: "2024-01-01T00:00:00.000Z",
      uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
      ref: "Proverbs1:1",
    };
    ddbMock.on(GetCommand).resolves({ Item: mockItem });

    const event = {
      pathParameters: {
        uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
        ref: "Proverbs1:1",
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await getUserNoteHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(mockItem);
  });

  it("returns 404 when note is not found", async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const event = {
      pathParameters: {
        uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
        ref: "Proverbs1:1",
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await getUserNoteHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({ error: "Note not found" });
  });

  it("returns 500 on DynamoDB error", async () => {
    ddbMock.on(GetCommand).rejects(new Error("DynamoDB failure"));

    const event = {
      pathParameters: {
        uuid: "66a20224-c0d1-70f3-58f9-4671e44cac10",
        ref: "Proverbs1:1",
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await getUserNoteHandler(createDocClient(), env, event);

    expect(result.statusCode).toBe(500);
  });
});
