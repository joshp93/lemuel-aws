import { BiblesResponse, Bible } from "../models/apiBible";

/**
 * Error thrown when a requested Bible version is not found in the API response.
 */
export class BibleNotFoundError extends Error {
  public readonly version: string;
  public readonly availableVersions: string[];

  constructor(version: string, availableVersions: string[]) {
    super(`Bible version "${version}" not found. Available versions: ${availableVersions.join(", ")}`);
    this.name = "BibleNotFoundError";
    this.version = version;
    this.availableVersions = availableVersions;
  }
}

/**
 * Fetches the list of available Bibles from the API.Bible API and finds the matching one.
 * @param baseUrl - The base URL of the API.Bible API
 * @param apiKey - The API key for authentication
 * @param version - The version abbreviation to search for (e.g., "niv", "kjv", "web")
 * @returns The matching Bible object
 * @throws BibleNotFoundError if the version is not found in the response
 */
export const fetchBible = async (
  baseUrl: string,
  apiKey: string,
  version: string,
): Promise<Bible> => {
  const url = `${baseUrl}/v1/bibles?language=eng&abbreviation=${version}`;

  const response = await fetch(url, {
    headers: {
      "api-key": apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch bibles: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = (await response.json()) as BiblesResponse;
  const bibles = data.data || [];

  const matchingBible = bibles.find(
    (b) => b.abbreviation.toLowerCase() === version.toLowerCase(),
  );

  if (!matchingBible) {
    const availableVersions = bibles.map((b) => b.abbreviation);
    throw new BibleNotFoundError(version, availableVersions);
  }

  return matchingBible;
};