import type { Proverb } from "../../fetch-proverbs-for-version/types";
import { ProverbEntitySchema } from "../../models/proverbStoreSchemas";

/**
 * A DynamoDB PutRequest wrapping a single proverb item.
 */
export interface ProverbItem {
  PutRequest: {
    Item: Record<string, unknown>;
  };
}

/**
 * Builds a DynamoDB PutRequest item from a proverb and version identifier.
 *
 * The partition key is constructed as `${version}#${ref}` (with spaces removed)
 * and the sort key is the space-free reference. The resulting object is validated
 * against ProverbEntitySchema before being returned.
 *
 * @param proverb - The proverb data to persist.
 * @param version - The Bible version identifier (e.g. "niv").
 * @returns A ProverbItem ready for use in a BatchWriteCommand.
 */
export const buildProverbItem = (
  proverb: Proverb,
  version: string,
): ProverbItem => {
  const refNoSpace = proverb.ref.replace(/\s+/g, "");
  const pk = `${version}#${refNoSpace}`;
  const sk = refNoSpace;

  const proverbEntity = ProverbEntitySchema.parse({
    pk,
    sk,
    proverb,
    version,
  });

  return {
    PutRequest: {
      Item: proverbEntity as Record<string, unknown>,
    },
  };
};
