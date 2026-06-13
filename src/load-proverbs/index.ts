import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ProverbEntitySchema,
  type RefsEntity,
  VersionCitationSchema,
  VersionEntitySchema,
} from "../models/proverbStoreSchemas";
import {
  type LoadProverbsEvent,
  LoadProverbsEventSchema,
} from "./eventSchemas";

export const handler = async (event: LoadProverbsEvent): Promise<void> => {
  console.debug("Event:", JSON.stringify(event));
  LoadProverbsEventSchema.parse(event);

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const tableName = process.env.TABLE_NAME!;
  const batchSize = 25;

  const items = event.proverbs.map((proverb) => {
    const refNoSpace = proverb.ref.replace(/\s+/g, "");
    const pk = `${event.version}#${refNoSpace}`;
    const sk = refNoSpace;

    const proverbEntity = ProverbEntitySchema.parse({
      pk,
      sk,
      proverb,
      version: event.version,
    });
    return {
      PutRequest: {
        Item: proverbEntity,
      },
    };
  });

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const command = new BatchWriteCommand({
      RequestItems: {
        [tableName]: batch,
      },
    });
    console.debug("Batch Write Command:", JSON.stringify(command));
    const response = await client.send(command);
    console.debug("Batch Write Response:", JSON.stringify(response));
  }

  const refsResult = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: "refs",
        sk: "refs",
      },
    }),
  );

  if (!refsResult.Item) {
    const refs: RefsEntity = {
      pk: "refs",
      sk: "refs",
      allRefs: event.proverbs.map((p) =>
        p.ref.replace(`${event.version}#`, "").replace(/\s+/g, ""),
      ),
      usedRefs: [],
    };

    console.debug("Creating refs item", JSON.stringify(refs));
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: refs,
      }),
    );
  } else {
    console.debug("Refs item already exists, skipping creation.");
  }

  const versionResult = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: "versions",
        sk: "versions",
      },
    }),
  );

  if (!versionResult.Item) {
    const versionEntity = VersionEntitySchema.parse({
      versions: [event.version],
    });
    console.debug("Creating versions item", JSON.stringify(versionEntity));
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: versionEntity,
      }),
    );
  } else {
    const existingVersions =
      (versionResult.Item as { versions?: string[] }).versions || [];
    if (!existingVersions.includes(event.version)) {
      const updatedVersions = [...existingVersions, event.version];
      const updatedEntity = VersionEntitySchema.parse({
        pk: "versions",
        sk: "versions",
        versions: updatedVersions,
      });
      console.debug("Updating versions item", JSON.stringify(updatedEntity));
      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: updatedEntity,
        }),
      );
    } else {
      console.debug(
        "Version already exists in versions list, skipping update.",
      );
    }
  }

  if (event.citation) {
    const citationEntity = VersionCitationSchema.parse({
      pk: "citation",
      sk: event.version,
      citation: event.citation,
    });
    console.debug(
      "Creating/updating citation item",
      JSON.stringify(citationEntity),
    );
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: citationEntity,
      }),
    );
  }
};
