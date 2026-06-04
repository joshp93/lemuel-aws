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

export const DailyProverbEntitySchema = z.object({
  pk: z.literal("daily-proverb"),
  sk: z.string(),
  ref: z.string(),
});

export type DailyProverbEntity = z.infer<typeof DailyProverbEntitySchema>;

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

export const NoteEntitySchema = z.object({
  pk: z.string().describe("The cognito uuid of the user who created the note"),
  sk: z.string().min(1).describe("The proverb reference, e.g. Proverbs3:5"),
  note: z.string().min(1).describe("The content of the note"),
  dateCreated: z.iso
    .datetime()
    .describe("ISO date string of when the note was created"),
  uuid: z
    .string()
    .describe("The cognito uuid of the user — mirrors pk for GSI access"),
  ref: z
    .string()
    .min(1)
    .describe("The proverb reference — mirrors sk for GSI access"),
});

export type NoteEntity = z.infer<typeof NoteEntitySchema>;

export const MeditationEntitySchema = z.object({
  pk: z.string(),
  sk: z.string(),
  uuid: z.string(),
  date: z.string(),
});

export type MeditationEntity = z.infer<typeof MeditationEntitySchema>;
