import { z } from "zod";

/** Environment variables expected by the push-daily-proverb Lambda. */
export const EnvSchema = z.object({
  TABLE_NAME: z.string(),
  FCM_SECRET_NAME: z.string(),
});

/** Zod schema for the DynamoDB Stream INSERT event that triggers the silent push. */
export const DynamoDBStreamEventSchema = z.object({
  Records: z.array(
    z.object({
      eventName: z.string(),
      dynamodb: z.object({
        Keys: z.object({
          pk: z.object({ S: z.string() }),
          sk: z.object({ S: z.string() }),
        }),
        NewImage: z
          .object({
            ref: z.object({ S: z.string() }).optional(),
          })
          .optional(),
      }),
    }),
  ),
});
