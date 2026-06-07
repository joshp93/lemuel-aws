import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { DeviceNotificationConfigEntitySchema } from "../models/proverbStoreSchemas";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface DeviceTokenResult {
  token: string;
  notificationsEnabled: string;
}

/** Scans the proverbs-store table for all device notification config records (pk = "device-notif-config").
 *  Returns token and notificationsEnabled for every registered device. */
export const queryAllDeviceTokens = async (
  tableName: string,
): Promise<DeviceTokenResult[]> => {
  const result = await client.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": "device-notif-config",
      },
    }),
  );

  return (result.Items ?? []).map((item) =>
    DeviceNotificationConfigEntitySchema.parse(item),
  );
};

/** Queries the device-notif-index GSI for configs where notificationsEnabled = "true".
 *  Returns only the raw FCM tokens of opted-in devices. */
export const queryEnabledDeviceTokens = async (
  tableName: string,
): Promise<{ token: string }[]> => {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "device-notif-index",
      KeyConditionExpression: "pk = :pk AND notificationsEnabled = :enabled",
      ExpressionAttributeValues: {
        ":pk": "device-notif-config",
        ":enabled": "true",
      },
    }),
  );

  return (result.Items ?? []).map((item) => ({
    token: DeviceNotificationConfigEntitySchema.parse(item).token,
  }));
};
