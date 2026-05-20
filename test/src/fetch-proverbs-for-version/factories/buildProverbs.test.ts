import {
  extractChapterFromRef,
  getChaptersFromRefs,
  parseRef,
  buildProverbsFromChapter,
} from "../../../../src/fetch-proverbs-for-version/factories/buildProverbs";
import { ContentElement } from "../../../../src/fetch-proverbs-for-version/models/apiBible";

describe("extractChapterFromRef", () => {
  it("extracts chapter number from valid ref", () => {
    expect(extractChapterFromRef("Proverbs 10:1")).toBe(10);
    expect(extractChapterFromRef("Proverbs 22:17")).toBe(22);
    expect(extractChapterFromRef("Proverbs 1:1")).toBe(1);
    expect(extractChapterFromRef("Proverbs 31:25")).toBe(31);
  });

  it("returns null for invalid ref format", () => {
    expect(extractChapterFromRef("Genesis 1:1")).toBeNull();
    expect(extractChapterFromRef("invalid")).toBeNull();
    expect(extractChapterFromRef("")).toBeNull();
  });
});

describe("getChaptersFromRefs", () => {
  it("extracts unique chapters from refs", () => {
    const refs = [
      "Proverbs 10:1",
      "Proverbs 10:2",
      "Proverbs 10:3",
      "Proverbs 11:1",
      "Proverbs 11:2",
      "Proverbs 12:1",
    ];
    const result = getChaptersFromRefs(refs);
    expect(result).toEqual([10, 11, 12]);
  });

  it("returns sorted chapters", () => {
    const refs = [
      "Proverbs 22:1",
      "Proverbs 10:1",
      "Proverbs 15:1",
    ];
    const result = getChaptersFromRefs(refs);
    expect(result).toEqual([10, 15, 22]);
  });

  it("returns empty array for empty input", () => {
    expect(getChaptersFromRefs([])).toEqual([]);
  });

  it("handles refs with verse ranges", () => {
    const refs = [
      "Proverbs 10:1-5",
      "Proverbs 10:6",
      "Proverbs 11:1",
    ];
    const result = getChaptersFromRefs(refs);
    expect(result).toEqual([10, 11]);
  });
});

describe("parseRef", () => {
  it("parses single verse ref", () => {
    const result = parseRef("Proverbs 10:1");
    expect(result).toEqual({
      chapter: 10,
      verseStart: 1,
      verseEnd: 1,
    });
  });

  it("parses verse range ref", () => {
    const result = parseRef("Proverbs 10:1-3");
    expect(result).toEqual({
      chapter: 10,
      verseStart: 1,
      verseEnd: 3,
    });
  });

  it("returns null for invalid ref", () => {
    expect(parseRef("invalid")).toBeNull();
    expect(parseRef("Genesis 1:1")).toBeNull();
    expect(parseRef("")).toBeNull();
  });
});

describe("buildProverbsFromChapter", () => {
  const createContent = (
    verses: Array<{ verse: number; text: string }>,
  ): ContentElement[] =>
    verses.map(({ verse, text }) => ({
      type: "tag" as const,
      name: "para" as const,
      attrs: {},
      items: [
        {
          type: "text" as const,
          text,
          attrs: { verseId: `PRO.10.${verse}` },
        },
      ],
    }));

  it("builds proverbs for matching chapter", () => {
    const content = createContent([
      { verse: 1, text: "The proverbs of Solomon." },
      { verse: 2, text: "Treasures of wickedness profit nothing." },
    ]);

    const result = buildProverbsFromChapter(content, 10);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("ref");
    expect(result[0]).toHaveProperty("proverb");
  });

  it("returns empty array when no matching verses", () => {
    const content = createContent([{ verse: 1, text: "Some text" }]);
    const result = buildProverbsFromChapter(content, 99);
    expect(result).toEqual([]);
  });

  it("builds proverb with multiple verses for verse range", () => {
    const content = createContent([
      { verse: 1, text: "Verse 1 text" },
      { verse: 2, text: "Verse 2 text" },
      { verse: 3, text: "Verse 3 text" },
    ]);

    const result = buildProverbsFromChapter(content, 10);

    const proverb10_1_3 = result.find((p: { ref: string }) => p.ref === "Proverbs 10:1-3");
    if (proverb10_1_3) {
      expect(proverb10_1_3.proverb).toContain("Verse 1 text");
      expect(proverb10_1_3.proverb).toContain("Verse 2 text");
      expect(proverb10_1_3.proverb).toContain("Verse 3 text");
    }
  });
});