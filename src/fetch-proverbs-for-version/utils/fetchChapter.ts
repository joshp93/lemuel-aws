import type { ChaptersResponse } from "../models/apiBible";

/**
 * Error thrown when fetching a chapter fails.
 */
export class ChapterFetchError extends Error {
  public readonly chapter: number;
  public readonly status: number;
  public readonly statusText: string;

  constructor(chapter: number, status: number, statusText: string) {
    super(`Failed to fetch chapter ${chapter}: ${status} ${statusText}`);
    this.name = "ChapterFetchError";
    this.chapter = chapter;
    this.status = status;
    this.statusText = statusText;
  }
}

/**
 * Fetches a chapter from the API.Bible API.
 * @param baseUrl - The base URL of the API.Bible API
 * @param apiKey - The API key for authentication
 * @param bibleId - The Bible ID to fetch the chapter from
 * @param chapter - The chapter number to fetch
 * @returns The chapter data containing the verse content
 * @throws ChapterFetchError if the fetch fails
 */
export const fetchChapter = async (
  baseUrl: string,
  apiKey: string,
  bibleId: string,
  chapter: number,
): Promise<ChaptersResponse> => {
  const url = `${baseUrl}/v1/bibles/${bibleId}/chapters/PRO.${chapter}?content-type=json`;

  const response = await fetch(url, {
    headers: {
      "api-key": apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ChapterFetchError(chapter, response.status, response.statusText);
  }

  return (await response.json()) as ChaptersResponse;
};
