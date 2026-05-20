import { ContentElement } from "../../../../src/fetch-proverbs-for-version/models/apiBible";
import { parseChapterContent } from "../../../../src/fetch-proverbs-for-version/transforms/parseChapterContent";
import { VERSE_MOCK } from "../mocks";

describe("parseChapterContent", () => {
  const createTextItem = (
    text: string,
    verseId?: string,
    vid?: string,
  ): ContentElement => ({
    type: "tag",
    name: "para",
    attrs: {},
    items: [
      {
        type: "text",
        text,
        attrs: {
          ...(verseId && { verseId }),
          ...(vid && { vid }),
        },
      },
    ],
  });

  const createNestedContent = (
    parts: Array<{ text: string; verseId?: string; vid?: string }>,
  ): ContentElement => ({
    type: "tag",
    name: "para",
    attrs: {},
    items: parts.map((part) => ({
      type: "text" as const,
      text: part.text,
      attrs: {
        ...(part.verseId && { verseId: part.verseId }),
        ...(part.vid && { vid: part.vid }),
      },
    })),
  });

  it("extracts verse from verseId attribute", () => {
    const content: ContentElement[] = [
      createTextItem("The proverbs of Solomon.", "PRO.10.1"),
    ];
    const result = parseChapterContent(content);
    expect(result.get(1)).toBe("The proverbs of Solomon.");
  });

  it("extracts verse from vid attribute", () => {
    const content: ContentElement[] = [
      createTextItem("A wise son makes a glad father.", undefined, "PRO 10:1"),
    ];
    const result = parseChapterContent(content);
    expect(result.get(1)).toBe("A wise son makes a glad father.");
  });

  it("extracts multiple verses", () => {
    const content: ContentElement[] = [
      createTextItem("Verse 1 text.", "PRO.10.1"),
      createTextItem("Verse 2 text.", "PRO.10.2"),
      createTextItem("Verse 3 text.", "PRO.10.3"),
    ];
    const result = parseChapterContent(content);
    expect(result.get(1)).toBe("Verse 1 text.");
    expect(result.get(2)).toBe("Verse 2 text.");
    expect(result.get(3)).toBe("Verse 3 text.");
  });

  it("appends text to same verse number", () => {
    const content: ContentElement[] = [
      {
        type: "tag",
        name: "para",
        items: [
          {
            type: "text",
            text: "The proverbs of",
            attrs: { verseId: "PRO.10.1" },
          },
          { type: "text", text: "Solomon:", attrs: { verseId: "PRO.10.1" } },
        ],
      },
    ];
    const result = parseChapterContent(content);
    expect(result.get(1)).toBe("The proverbs of Solomon:");
  });

  it("returns empty map for empty content", () => {
    const result = parseChapterContent([]);
    expect(result.size).toBe(0);
  });

  it("ignores non-tag items", () => {
    const content: ContentElement[] = [
      { type: "text", name: "chapter", items: [] },
      createTextItem("Valid verse.", "PRO.10.1"),
    ];
    const result = parseChapterContent(content);
    expect(result.get(1)).toBe("Valid verse.");
  });

  it("handles multiple verses from same chapter (chapter 11)", () => {
    const content: ContentElement[] = [
      createTextItem(
        "A false balance is abomination to Yahweh.",
        undefined,
        "PRO 11:1",
      ),
      createTextItem(
        "When pride comes, then comes shame.",
        undefined,
        "PRO 11:2",
      ),
    ];
    const result = parseChapterContent(content);
    expect(result.get(1)).toBe("A false balance is abomination to Yahweh.");
    expect(result.get(2)).toBe("When pride comes, then comes shame.");
  });

  it("handles verse ranges from PRO.10.1-PRO.10.5", () => {
    const content: ContentElement[] = [
      createTextItem("Verse 1.", "PRO.10.1"),
      createTextItem("Verse 2.", "PRO.10.2"),
      createTextItem("Verse 3.", "PRO.10.3"),
      createTextItem("Verse 4.", "PRO.10.4"),
      createTextItem("Verse 5.", "PRO.10.5"),
    ];
    const result = parseChapterContent(content);
    expect(result.size).toBe(5);
    expect(result.get(5)).toBe("Verse 5.");
  });

  it("Correctly parses verse content", () => {
    expect(parseChapterContent(VERSE_MOCK)).toEqual(
      new Map([
        [
          3,
          "The Lord will not allow the righteous soul to famish,\nBut He casts away the desire of the wicked.",
        ],
      ]),
    );
  });
});
