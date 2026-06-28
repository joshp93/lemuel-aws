import { REFS } from "../constants/refs";
import {
  buildProverbsFromChapter,
  getChaptersFromRefs,
} from "../factories/buildProverbs";
import type { Proverb, VersionInput, VersionOutput } from "../types";
import { fetchBible } from "../utils/fetchBible";
import { fetchChapter } from "../utils/fetchChapter";

/**
 * Fetches all configured proverbs from API.Bible for a single Bible version.
 * Resolves the Bible ID from the version abbreviation, then fetches each chapter
 * and extracts proverb text matching the configured references.
 *
 * @param apiKey - API.Bible API key for authentication
 * @param baseUrl - Base URL of the API.Bible REST API
 * @param input - Version input object containing version abbreviation and optional citation
 * @returns VersionOutput with version name, proverbs array, and optional citation
 */
export const fetchSingleVersion = async (
  apiKey: string,
  baseUrl: string,
  input: VersionInput,
): Promise<VersionOutput> => {
  const { version, citation } = input;

  console.log(`Starting fetch for version: ${version}`);

  const bible = await fetchBible(baseUrl, apiKey, version);
  const bibleId = bible.id;
  const versionName = bible.abbreviationLocal.toLowerCase();
  console.log(`Found matching bible: ${bible.name} (ID: ${bibleId})`);

  const chapters = getChaptersFromRefs(REFS);
  console.log(`Building chapter list from ${REFS.length} proverb references`);
  console.log(`Prepared to fetch ${chapters.length} chapters`);

  const proverbs: Proverb[] = [];

  for (const chapter of chapters) {
    console.log(`Fetching chapter ${chapter}...`);

    const chapterData = await fetchChapter(baseUrl, apiKey, bibleId, chapter);
    const content = chapterData.data.content || [];

    const chapterProverbs = buildProverbsFromChapter(content, chapter);
    proverbs.push(...chapterProverbs);

    console.log(
      `Chapter ${chapter} complete - collected ${chapterProverbs.length} proverbs`,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(
    `Fetch complete for ${version} - total proverbs: ${proverbs.length}`,
  );

  return {
    version: versionName,
    ...(citation && { citation }),
    proverbs,
  };
};
