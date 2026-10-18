import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { getReactionsHandler } from "../../../../src/note-handler/getReactions/index";
import { authenticatedEvent } from "../../../helpers/authenticatedEvent";

const createDocClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}));

describe("getReactionsHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const env = { TABLE_NAME: "TestTable", FCM_SECRET_NAME: "test-fcm-secret" };

  beforeEach(() => {
    ddbMock.reset();
  });

  const reactionItems = [
    {
      pk: "note#author-id#Proverbs3:5#2024-01-01",
      sk: "reaction#user-1",
      reactionType: "🙏",
      reactorUuid: "user-1",
      createdAt: "2024-01-01T12:00:00.000Z",
    },
    {
      pk: "note#author-id#Proverbs3:5#2024-01-01",
      sk: "reaction#user-2",
      reactionType: "❤️",
      reactorUuid: "user-2",
      createdAt: "2024-01-01T13:00:00.000Z",
    },
  ];

  const makeEvent = (
    sub?: string,
    queryStringParameters: Record<string, string> = { date: "2024-01-01" },
  ) =>
    sub
      ? authenticatedEvent(sub, {
          pathParameters: { uuid: "author-id", ref: "Proverbs3:5" },
          queryStringParameters,
        })
      : ({
          pathParameters: { uuid: "author-id", ref: "Proverbs3:5" },
          queryStringParameters,
        } as unknown as Parameters<typeof getReactionsHandler>[2]);

  it("returns reactions with counts and display names", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: reactionItems });
    ddbMock.on(BatchGetCommand).resolves({
      Responses: {
        TestTable: [
          { pk: "user-1", sk: "account", displayName: "Alice" },
          { pk: "user-2", sk: "account", displayName: "Bob" },
        ],
      },
    });

    const result = await getReactionsHandler(
      createDocClient(),
      env,
      makeEvent("user-1"),
    );

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.reactionCounts).toEqual({ "🙏": 1, "❤️": 1 });
    expect(body.userReaction).toBe("🙏");
    expect(body.reactions).toHaveLength(2);
    expect(body.reactions[0].displayName).toBe("Alice");
    expect(body.reactions[1].displayName).toBe("Bob");
  });

  it("takes the requesting user from the token, not the query string", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: reactionItems });
    ddbMock.on(BatchGetCommand).resolves({
      Responses: {
        TestTable: [
          { pk: "user-1", sk: "account", displayName: "Alice" },
          { pk: "user-2", sk: "account", displayName: "Bob" },
        ],
      },
    });

    const result = await getReactionsHandler(
      createDocClient(),
      env,
      makeEvent("user-1", { date: "2024-01-01", userId: "user-2" }),
    );

    expect(JSON.parse(result.body).userReaction).toBe("🙏");
  });

  it("returns empty reactions and no userReaction when none exist", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const result = await getReactionsHandler(
      createDocClient(),
      env,
      makeEvent("user-1"),
    );

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.reactionCounts).toEqual({});
    expect(body.userReaction).toBeUndefined();
    expect(body.reactions).toEqual([]);
  });

  it("returns 500 on error", async () => {
    ddbMock.on(QueryCommand).rejects(new Error("DynamoDB failure"));

    const result = await getReactionsHandler(
      createDocClient(),
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(500);
  });
});
