/**
 * Generic DynamoDB Stream record with the NewImage content typed via
 * the {@link TImage} parameter. PK and SK are promoted from the raw
 * DynamoDB format (`.S`) for convenient access.
 */
export interface DdbStreamRecord<TImage = Record<string, string>> {
  eventName: string;
  pk: string;
  sk: string;
  newImage: TImage | undefined;
}

/**
 * Safely narrows an `unknown` value to a {@link DdbStreamRecord}.
 *
 * Validates the DynamoDB Stream envelope (`eventName`, `dynamodb.Keys`).
 * When {@link expectedPk} is provided the record's partition key must
 * match it exactly. Each key listed in {@link requiredKeys} must exist
 * as a string attribute in the record's NewImage.
 *
 * Returns `undefined` when the shape does not match so the caller can
 * skip the record as a no-op.
 *
 * @example
 * ```ts
 * const record = parseDdbRecord(raw, ["content"], "reply-notification");
 * // record.newImage.content is a string if record is defined
 * ```
 */
export const parseDdbRecord = <TImage = Record<string, string>>(
  record: unknown,
  requiredKeys: (keyof TImage)[],
  expectedPk?: string,
): DdbStreamRecord<TImage> | undefined => {
  if (!record || typeof record !== "object") return undefined;

  const r = record as Record<string, unknown>;
  if (typeof r.eventName !== "string") return undefined;

  const dynamodb = r.dynamodb as Record<string, unknown> | undefined;
  if (!dynamodb) return undefined;

  const keys = dynamodb.Keys as Record<string, { S?: string }> | undefined;
  if (!keys || typeof keys.pk?.S !== "string" || typeof keys.sk?.S !== "string")
    return undefined;

  if (expectedPk !== undefined && keys.pk.S !== expectedPk) return undefined;

  const rawImage = dynamodb.NewImage as
    | Record<string, { S?: string }>
    | undefined;

  if (requiredKeys.length > 0) {
    if (!rawImage) return undefined;
    for (const key of requiredKeys) {
      const attr = rawImage[key as string];
      if (typeof attr?.S !== "string") return undefined;
    }
  }

  const newImage = (
    rawImage
      ? Object.fromEntries(
          Object.entries(rawImage)
            .filter(([, v]) => v?.S !== undefined)
            .map(([k, v]) => [k, v!.S]),
        )
      : undefined
  ) as TImage | undefined;

  return {
    eventName: r.eventName,
    pk: keys.pk.S,
    sk: keys.sk.S,
    newImage,
  };
};
