import { ContentElement, ContentTextItem } from "../models/apiBible";

/**
 * Recursively extracts all text content from a list of content elements.
 * Handles nested tags like <char style="sc">Lord</char> by traversing their children.
 * @param items - Array of content elements to extract text from
 * @returns The concatenated text content with spaces between items
 */
export const extractText = (
  items: (ContentElement | ContentTextItem)[],
): string => {
  let result = "";
  for (const item of items) {
    if (item.type === "text") {
      const text = (item as ContentTextItem).text;
      if (!text) continue;
      if (result && !result.endsWith(" ")) {
        result += " ";
      }
      result += text;
    } else if ((item as ContentElement).items) {
      const nested = extractText(
        (item as ContentElement).items as (ContentElement | ContentTextItem)[],
      );
      if (!nested) continue;
      if (result && !result.endsWith(" ")) {
        result += " ";
      }
      result += nested;
    }
  }
  return result;
};