import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";

const MigrationSchema = z.object({
  oldUuid: z.string().min(1),
  newUuid: z.string().min(1),
});

const MigrateUserUuidsEventSchema = z.object({
  migrations: z.array(MigrationSchema).min(1),
});

type Migration = z.infer<typeof MigrationSchema>;

export const handler = async (
  event: unknown,
): Promise<{ migrated: number }> => {
  console.debug("Event:", JSON.stringify(event));
  const parsed = MigrateUserUuidsEventSchema.parse(event);
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const tableName = process.env.TABLE_NAME!;
  let total = 0;

  for (const m of parsed.migrations) {
    total += await migrateUser(client, tableName, m);
  }

  console.info(
    `Migration complete: ${total} items updated across ${parsed.migrations.length} users`,
  );
  return { migrated: total };
};

async function migrateUser(
  client: DynamoDBDocumentClient,
  tableName: string,
  { oldUuid, newUuid }: Migration,
): Promise<number> {
  let count = 0;

  const rawItems = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": oldUuid },
    }),
  );

  for (const item of rawItems.Items ?? []) {
    const newItem = { ...item, pk: newUuid } as Record<string, unknown>;
    if (newItem.uuid === oldUuid) newItem.uuid = newUuid;

    await client.send(new PutCommand({ TableName: tableName, Item: newItem }));
    await client.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { pk: item.pk, sk: item.sk },
      }),
    );
    count++;
  }

  const meditationItems = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": `meditation#${oldUuid}` },
    }),
  );

  for (const item of meditationItems.Items ?? []) {
    const newPk = `meditation#${newUuid}`;
    const newItem = { ...item, pk: newPk } as Record<string, unknown>;
    if (newItem.uuid === oldUuid) newItem.uuid = newUuid;

    await client.send(new PutCommand({ TableName: tableName, Item: newItem }));
    await client.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { pk: item.pk, sk: item.sk },
      }),
    );
    count++;
  }

  const displayNameGet = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: `display-name#${oldUuid}`, sk: `display-name#${oldUuid}` },
    }),
  );

  if (displayNameGet.Item) {
    const item = displayNameGet.Item;
    const newPkSk = `display-name#${newUuid}`;
    const newItem = { ...item, pk: newPkSk, sk: newPkSk };

    await client.send(new PutCommand({ TableName: tableName, Item: newItem }));
    await client.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { pk: item.pk, sk: item.sk },
      }),
    );
    count++;
  }

  return count;
}
