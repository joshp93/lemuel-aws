import type { DdbStreamRecord } from "../shared/parseDdbRecord";

/** Attribute shape of a daily-proverb DynamoDB stream record. */
export interface DailyProverbImage {
  ref: string;
}

/** Fully narrowed DynamoDB Stream record for daily proverb pushes. */
export type DailyProverbRecord = DdbStreamRecord<DailyProverbImage>;
