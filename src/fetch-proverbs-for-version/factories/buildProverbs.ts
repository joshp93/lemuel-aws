import { REFS } from "../constants/refs";
import type { ContentElement } from "../models/apiBible";
import { parseChapterContent } from "../transforms/parseChapterContent";
import type { Proverb } from "../types";

/**
 * Extracts the chapter number from a reference string like "Proverbs 10:1".
 * @param ref - The reference string to parse
 * @returns The chapter number, or null if the reference is not in the expected format
 */
export const extractChapterFromRef = (ref: string): number | null => {
  const match = ref.match(/^Proverbs (\d+):/);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Extracts chapter numbers from all references.
 * @param refs - Array of reference strings (e.g., ["Proverbs 10:1", "Proverbs 10:2"])
 * @returns Sorted array of unique chapter numbers
 */
export const getChaptersFromRefs = (refs: string[]): number[] => {
  const chaptersSet = new Set<number>();
  for (const ref of refs) {
    const chapter = extractChapterFromRef(ref);
    if (chapter !== null) {
      chaptersSet.add(chapter);
    }
  }
  return Array.from(chaptersSet).sort((a, b) => a - b);
};

/**
 * Extracts verse range from a reference string.
 * @param ref - The reference string (e.g., "Proverbs 10:1", "Proverbs 10:1-3")
 * @returns Object with chapter number, verse start, and optional verse end
 */
export const parseRef = (
  ref: string,
): { chapter: number; verseStart: number; verseEnd: number } | null => {
  const match = ref.match(/^Proverbs (\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;

  return {
    chapter: parseInt(match[1], 10),
    verseStart: parseInt(match[2], 10),
    verseEnd: match[3] ? parseInt(match[3], 10) : parseInt(match[2], 10),
  };
};

/**
 * Builds proverbs from chapter content for a specific chapter.
 * @param content - Array of content elements from the chapter API response
 * @param chapter - The chapter number to build proverbs for
 * @returns Array of proverb objects with ref and proverb text
 */
export const buildProverbsFromChapter = (
  content: ContentElement[],
  chapter: number,
): Proverb[] => {
  const versesMap = parseChapterContent(content);
  const chapterProverbs: Proverb[] = [];

  for (const kjvRef of REFS) {
    const parsed = parseRef(kjvRef);
    if (!parsed || parsed.chapter !== chapter) continue;

    const proverbParts: string[] = [];
    for (let v = parsed.verseStart; v <= parsed.verseEnd; v++) {
      const verseText = versesMap.get(v);
      if (verseText) {
        proverbParts.push(verseText);
      }
    }

    if (proverbParts.length > 0) {
      chapterProverbs.push({
        ref: kjvRef,
        proverb: proverbParts.join(" "),
      });
    }
  }

  return chapterProverbs;
};
