import z from "zod";
import { ProverbSchema } from "../models/proverbStoreSchemas";

/**
 * Schema for a single version output containing its proverbs and optional citation.
 */
export const VersionOutputSchema = z.object({
  version: z.string().lowercase(),
  proverbs: z.array(ProverbSchema),
  citation: z.string().optional(),
});

/**
 * Schema for the load-proverbs event, which is an array of version outputs.
 */
export const LoadProverbsEventSchema = z.array(VersionOutputSchema);

/** Inferred type for a single version output payload. */
export type LoadProverbsEvent = z.infer<typeof LoadProverbsEventSchema>;

/** Inferred type for a single version output payload. */
export type VersionOutput = z.infer<typeof VersionOutputSchema>;
