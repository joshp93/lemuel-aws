import { z } from "zod";

export const RefsEntitySchema = z.object({
  pk: z.string(),
  sk: z.string(),
  allRefs: z.array(z.string()),
  usedRefs: z.array(z.string()),
});

export type RefsEntity = z.infer<typeof RefsEntitySchema>;

export const ProverbSchema = z.object({
  ref: z.string(),
  proverb: z.string(),
});

export type Proverb = z.infer<typeof ProverbSchema>;

export const ProverbEntitySchema = z.object({
  pk: z.string(),
  sk: z.string(),
  proverb: ProverbSchema,
  version: z.string().lowercase(),
});

export type ProverbEntity = z.infer<typeof ProverbEntitySchema>;

export const ProverbForTheDayEntitySchema = z.object({
  pk: z.string(),
  sk: z.string(),
  ref: z.string(),
});

export type ProverbForTheDayEntity = z.infer<
  typeof ProverbForTheDayEntitySchema
>;

export const VersionEntitySchema = z.object({
  pk: z.string().default("versions"),
  sk: z.string().default("versions"),
  versions: z.array(z.string()),
});

export type VersionEntity = z.infer<typeof VersionEntitySchema>;

export const VersionCitationSchema = z.object({
  pk: z.string(),
  sk: z.string(),
  citation: z.string(),
});

export type VersionCitation = z.infer<typeof VersionCitationSchema>;

export const AccountEntitySchema = z.object({
  pk: z.string(),
  sk: z.string(),
  accountCreatedDate: z.string(),
  totalMeditations: z.number(),
  totalNotes: z.number(),
});

export type AccountEntity = z.infer<typeof AccountEntitySchema>;
