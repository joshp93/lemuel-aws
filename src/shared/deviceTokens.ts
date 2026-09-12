import { createHash } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { DeviceTokenEntitySchema } from "../models/proverbStoreSchemas";

const getClient = () => DynamoDBDocumentClient.from(new DynamoDBClient({}));

export interface DeviceTokenResult {
  token: string;
  platform: string;
}

/** Queries the proverbs-store table partition key for all device token records.
 *  Returns token and platform for every registered device. */
export const queryAllDeviceTokens = async (
  tableName: string,
): Promise<DeviceTokenResult[]> => {
  const result = await getClient().send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": "device-token",
      },
    }),
  );

  return ((result?.Items as unknown[] | undefined) ?? []).map((item) =>
    DeviceTokenEntitySchema.parse(item),
  );
};

/** Queries device tokens by userId using the user-device-tokens-index GSI.
 *  Returns token and platform for every device owned by the user. */
export const queryDeviceTokensByUser = async (
  tableName: string,
  userId: string,
): Promise<DeviceTokenResult[]> => {
  const result = await getClient().send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "user-device-tokens-index",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    }),
  );

  return ((result?.Items as unknown[] | undefined) ?? []).map((item) =>
    DeviceTokenEntitySchema.parse(item),
  );
};

/** Links a device token to a user by setting the userId attribute on
 *  the device token record. No-op if the token doesn't exist. */
export const linkDeviceToken = async (
  client: DynamoDBDocumentClient,
  tableName: string,
  deviceToken: string,
  userId: string,
): Promise<void> => {
  const hash = createHash("sha256").update(deviceToken).digest("hex");
  const existing = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: "device-token", sk: hash },
    }),
  );
  if (existing.Item) {
    await client.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk: "device-token", sk: hash },
        UpdateExpression: "SET userId = :userId",
        ExpressionAttributeValues: { ":userId": userId },
      }),
    );
  }
};
export const deleteDeviceToken = async (
  tableName: string,
  token: string,
): Promise<void> => {
  const sk = createHash("sha256").update(token).digest("hex");
  await getClient().send(
    new DeleteCommand({
      TableName: tableName,
      Key: { pk: "device-token", sk },
    }),
  );
};
