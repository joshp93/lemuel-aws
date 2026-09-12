import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { deleteAccountHandler } from "../../../../src/account-handler/deleteAccount/index";

jest.mock("@aws-sdk/client-cognito-identity-provider");

describe("deleteAccountHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const cognitoMock = mockClient(CognitoIdentityProviderClient);
  const env = { TABLE_NAME: "TestTable", USER_POOL_ID: "us-east-1_test" };

  beforeEach(() => {
    ddbMock.reset();
    cognitoMock.reset();
    ddbMock
      .on(QueryCommand, { IndexName: "user-device-tokens-index" })
      .resolves({ Items: [] });
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    ddbMock.on(BatchWriteCommand).resolves({});
    ddbMock.on(UpdateCommand).resolves({});
    cognitoMock.on(AdminDeleteUserCommand).resolves({});
  });

  const makeEvent = (): APIGatewayProxyEvent =>
    ({
      pathParameters: { uuid: "user-1" },
      requestContext: {
        authorizer: {
          claims: { sub: "user-1" },
        },
      },
    }) as unknown as APIGatewayProxyEvent;

  it("returns 403 when sub does not match path uuid", async () => {
    const event = {
      pathParameters: { uuid: "user-1" },
      requestContext: { authorizer: { claims: { sub: "user-2" } } },
    } as unknown as APIGatewayProxyEvent;

    const result = await deleteAccountHandler(
      ddbMock as unknown as DynamoDBDocumentClient,
      env,
      event,
    );

    expect(result.statusCode).toBe(403);
  });

  it("deletes user items and cognito account", async () => {
    ddbMock
      .on(QueryCommand)
      .resolves({ Items: [{ pk: "user-1", sk: "account" }] });
    ddbMock
      .on(QueryCommand, { IndexName: "user-device-tokens-index" })
      .resolves({ Items: [] });

    const result = await deleteAccountHandler(
      ddbMock as unknown as DynamoDBDocumentClient,
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ success: true });
    expect(cognitoMock.commandCalls(AdminDeleteUserCommand)).toHaveLength(1);
  });

  it("cleans up reaction trackers and related entities", async () => {
    let callCount = 0;
    ddbMock.on(QueryCommand).callsFake((_input) => {
      callCount++;
      if (callCount === 3) {
        return Promise.resolve({
          Items: [
            {
              pk: "user-1",
              sk: "reaction-tracker#author-2#Proverbs3:5#2024-01-01",
            },
          ],
        });
      }
      if (callCount === 4) {
        return Promise.resolve({
          Items: [
            {
              pk: "user-1",
              sk: "reply-tracker#author-2#Proverbs3:5#2024-01-01#reply#2024-01-01T12:00:00.000Z",
            },
          ],
        });
      }
      return Promise.resolve({ Items: [] });
    });

    const result = await deleteAccountHandler(
      ddbMock as unknown as DynamoDBDocumentClient,
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(200);

    const batchCalls = ddbMock.commandCalls(BatchWriteCommand);
    expect(batchCalls.length).toBeGreaterThan(0);
  });

  it("recomputes reactionCounts after deletion", async () => {
    let callCount = 0;
    ddbMock.on(QueryCommand).callsFake((_input) => {
      callCount++;
      if (callCount === 3) {
        return Promise.resolve({
          Items: [
            {
              pk: "user-1",
              sk: "reaction-tracker#author-2#Proverbs3:5#2024-01-01",
            },
          ],
        });
      }
      if (callCount === 6) {
        return Promise.resolve({
          Items: [{ reactionType: "👍" }],
        });
      }
      return Promise.resolve({ Items: [] });
    });
    ddbMock
      .on(QueryCommand, { IndexName: "user-device-tokens-index" })
      .resolves({ Items: [] });

    ddbMock.on(GetCommand).resolves({
      Item: { reactionType: "🙏" },
    });

    const result = await deleteAccountHandler(
      ddbMock as unknown as DynamoDBDocumentClient,
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(200);

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    const setCalls = updateCalls.filter((c) =>
      c.args[0].input.UpdateExpression?.includes("SET reactionCounts"),
    );
    expect(setCalls.length).toBeGreaterThan(0);
  });

  it("returns 500 on error", async () => {
    ddbMock.on(QueryCommand).rejects(new Error("DynamoDB failure"));

    const result = await deleteAccountHandler(
      ddbMock as unknown as DynamoDBDocumentClient,
      env,
      makeEvent(),
    );

    expect(result.statusCode).toBe(500);
  });
});
