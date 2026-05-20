import { REFS } from "./constants/refs";
import { normalizeToAscii } from "./transforms/normalizeToAscii";
import { buildProverbsFromChapter, getChaptersFromRefs } from "./factories/buildProverbs";
import { fetchBible } from "./utils/fetchBible";
import { fetchChapter } from "./utils/fetchChapter";
import { getSecret } from "./utils/getSecret";
import {
  FetchProverbsForVersionEvent,
  FetchProverbsForVersionEventSchema,
  Output,
  Proverb,
} from "./types";

/**
 * Lambda handler that fetches Proverbs from API.Bible for a specific version.
 * Retrieves the Bible ID from the bibles endpoint, then fetches chapter data
 * and extracts proverb text for all configured references.
 *
 * @param event - The Lambda event containing version and optional citation
 * @returns Output object with version, proverbs array, and optional citation
 */
export const handler = async (
  event: FetchProverbsForVersionEvent,
): Promise<Output> => {
  console.debug("Event:", JSON.stringify(event));

  const parsed = FetchProverbsForVersionEventSchema.parse(event);
  const { version } = parsed;

  const secretName = process.env.API_BIBLE_SECRET_NAME!;
  const secret = await getSecret(secretName);
  const { apiKey, baseUrl } = secret;

  console.log(`Starting fetch for version: ${version}`);
  console.log(`Using base URL: ${baseUrl}`);

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

  const output: Output = {
    version: versionName,
    ...(parsed.citation && { citation: normalizeToAscii(parsed.citation) }),
    proverbs,
  };

  console.log(`Fetch complete - total proverbs: ${proverbs.length}`);

  return output;
};