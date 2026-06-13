import type { ContentElement, ContentTextItem } from "../models/apiBible";

/**
 * Extracts the verse number from a verse reference string.
 * Supports two formats:
 * - verseId format: "PRO.10.3" (returns 3)
 * - sid/vid format: "PRO 10:3" (returns 3)
 * @param str - The verse reference string to parse
 * @returns The verse number, or null if the string doesn't match expected format
 */
export const parseVerseNum = (str: string | undefined): number | null => {
  if (!str) return null;
  const match = str.match(/(?:PRO\.(\d+)\.(\d+))|(?:PRO (\d+):(\d+))/);
  if (!match) return null;
  return parseInt(match[2] ?? match[4], 10);
};

/**
 * Recursively processes content items and accumulates verse text into the verses map.
 * Items with explicit verseId attributes are marked as having an explicit verse number,
 * which then becomes the inherited verse number for their sibling and child items.
 * Items with type "v" (verse markers) are skipped as they are structural elements.
 * @param name - The name of the current content element, i.e. "para", "char", etc. If it is para then the first item must always start on a new line.
 * @param items - Array of content items to process
 * @param inheritedVerseNum - Verse number inherited from parent context
 * @param versesMap - Map to accumulate verse text
 */
const processItems = (
  name: string,
  items: (ContentElement | ContentTextItem)[] | undefined,
  inheritedVerseNum: number | null,
  versesMap: Map<number, string>,
): void => {
  for (const item of items ?? []) {
    const textItem = item as ContentTextItem;
    const elemItem = item as ContentElement;

    if (elemItem.name === "verse") {
      processItems(elemItem.name, elemItem.items, inheritedVerseNum, versesMap);
      continue;
    }

    const itemVerseId = textItem.attrs?.verseId as string | undefined;
    const itemVerseNum = parseVerseNum(itemVerseId);

    const sidAttr = elemItem.attrs?.sid as string | undefined;
    const vidAttr = elemItem.attrs?.vid as string | undefined;
    const sidOrVidVerseNum = parseVerseNum(sidAttr ?? vidAttr);

    const explicitVerseNum = itemVerseNum ?? sidOrVidVerseNum;
    const effectiveVerseNum = explicitVerseNum ?? inheritedVerseNum;
    const hasExplicit = explicitVerseNum !== null;

    if (textItem.type === "text") {
      if (effectiveVerseNum && textItem.text) {
        const existing = versesMap.get(effectiveVerseNum) || "";
        versesMap.set(
          effectiveVerseNum,
          appendText(name, existing, textItem.text),
        );
      }
    } else if (elemItem.items) {
      processItems(
        elemItem.name,
        elemItem.items,
        hasExplicit ? effectiveVerseNum : inheritedVerseNum,
        versesMap,
      );
    }
  }
};

/**
 * Appends new text to existing verse text, ensuring proper spacing and new lines where applicable.
 * @param name - The name of the current content element, i.e. "para", "char", etc. If it is para then the first item must always start on a new line.
 * @param existing - The existing verse text
 * @param newText - The new text to append
 * @returns The combined verse text
 */
const appendText = (
  name: string,
  existing: string,
  newText: string,
): string => {
  newText = newText.trim();
  let existingEndsWithPunctuation = false;
  if (existing) {
    const lastChar = existing.slice(-1);
    existingEndsWithPunctuation = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(
      lastChar,
    );
  }
  if (name === "para" && existingEndsWithPunctuation) {
    return existing ? `${existing}\n${newText}` : newText;
  }
  return existing ? `${existing} ${newText}` : newText;
};

/**
 * Parses chapter content and extracts verse text into a map keyed by verse number.
 * Extracts text from both direct text items and nested tags (like <char style="sc">).
 * Text without explicit verseId attributes inherits the verse number from the nearest
 * ancestor that has an explicit verseId, sid, or vid attribute.
 * @param content - Array of content elements from the chapter API response
 * @returns Map of verse number to verse text
 */
export const parseChapterContent = (
  content: ContentElement[],
): Map<number, string> => {
  const versesMap = new Map<number, string>();

  for (const item of content) {
    if (item.type !== "tag") continue;
    const vidAttr = (item as ContentElement).attrs?.vid as string | undefined;
    const paraVerseNum = parseVerseNum(vidAttr);
    processItems(item.name, item.items, paraVerseNum, versesMap);
  }

  return versesMap;
};
