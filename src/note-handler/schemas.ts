import { z } from "zod";
import type { NoteEntity } from "../models/proverbStoreSchemas";

export const NoteHandlerEnvSchema = z.object({
  TABLE_NAME: z.string().min(1, "TABLE_NAME is required"),
});

export type NoteHandlerEnv = z.infer<typeof NoteHandlerEnvSchema>;

type NoteWithDisplayName = NoteEntity & { displayName: string };

/** Paginated list of notes for a given proverb reference */
export type GetProverbNotesResponse = {
  items: NoteWithDisplayName[];
  lastKey?: string;
};

/** A single note identified by user uuid and proverb ref */
export type GetUserNoteResponse = NoteWithDisplayName;

/** Paginated list of notes for a given user */
export type GetUserNotesResponse = {
  items: NoteWithDisplayName[];
  lastKey?: string;
};

/** The created/updated note entity */
export type CreateNoteResponse = NoteEntity;
