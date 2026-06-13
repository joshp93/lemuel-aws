import z from "zod";
import type {
  BiblesResponse,
  ChaptersResponse,
  ContentElement,
  ContentTextItem,
} from "./models/apiBible";

export const FetchProverbsForVersionEventSchema = z.object({
  version: z.string().min(1, "Version is required").lowercase(),
  citation: z.string().optional(),
});

export type FetchProverbsForVersionEvent = z.infer<
  typeof FetchProverbsForVersionEventSchema
>;

export interface Output {
  version: string;
  proverbs: Proverb[];
  citation?: string;
}

export interface Secret {
  apiKey: string;
  baseUrl: string;
}

export interface Proverb {
  ref: string;
  proverb: string;
}

export type {
  BiblesResponse,
  ChaptersResponse,
  ContentElement,
  ContentTextItem,
};
