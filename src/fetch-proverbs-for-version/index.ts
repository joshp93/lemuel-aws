import { fetchSingleVersion } from "./services/fetchSingleVersion";
import {
  type FetchProverbsForVersionEvent,
  FetchProverbsForVersionEventSchema,
  type Output,
  type VersionOutput,
} from "./types";
import { getSecret } from "./utils/getSecret";

/**
 * Lambda handler that fetches Proverbs from API.Bible for one or more Bible versions.
 * Accepts an array of version and citation objects, fetches proverbs for each version,
 * and returns an array of per-version results.
 *
 * @param event - Array of version input objects, each with a version abbreviation and optional citation
 * @returns Array of VersionOutput objects containing the fetched proverbs
 */
export const handler = async (
  event: FetchProverbsForVersionEvent,
): Promise<Output> => {
  console.debug("Event:", JSON.stringify(event));

  const parsed = FetchProverbsForVersionEventSchema.parse(event);

  const secretName = process.env.API_BIBLE_SECRET_NAME!;
  const secret = await getSecret(secretName);
  const { apiKey, baseUrl } = secret;

  console.log(`Using base URL: ${baseUrl}`);

  const results: VersionOutput[] = [];
  for (const versionInput of parsed) {
    const result = await fetchSingleVersion(apiKey, baseUrl, versionInput);
    results.push(result);
  }

  return results;
};
