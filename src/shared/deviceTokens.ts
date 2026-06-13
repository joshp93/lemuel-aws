import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DeviceTokenEntitySchema } from "../models/proverbStoreSchemas";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export interface DeviceTokenResult {
  token: string;
  platform: string;
}

/** Queries the proverbs-store table partition key for all device token records.
 *  Returns token and platform for every registered device. */
export const queryAllDeviceTokens = async (
  tableName: string,
): Promise<DeviceTokenResult[]> => {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": "device-token",
      },
    }),
  );

  return (result.Items ?? []).map((item) =>
    DeviceTokenEntitySchema.parse(item),
  );
};
