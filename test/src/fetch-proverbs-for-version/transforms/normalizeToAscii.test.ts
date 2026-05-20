import { normalizeToAscii } from "../../../../src/fetch-proverbs-for-version/transforms/normalizeToAscii";

describe("normalizeToAscii", () => {
  it("converts curly single quotes to straight apostrophe", () => {
    expect(normalizeToAscii("don't")).toBe("don't");
    expect(normalizeToAscii("\u2018test\u2019")).toBe("'test'");
  });

  it("converts curly double quotes to straight quotes", () => {
    expect(normalizeToAscii("\u201Chello\u201D")).toBe('"hello"');
  });

  it("converts en dash to hyphen", () => {
    expect(normalizeToAscii("\u2013")).toBe("-");
  });

  it("converts em dash to hyphen", () => {
    expect(normalizeToAscii("\u2014")).toBe("-");
  });

  it("converts ellipsis to three periods", () => {
    expect(normalizeToAscii("\u2026")).toBe("...");
  });

  it("converts non-breaking space to space", () => {
    expect(normalizeToAscii("hello\u00A0world")).toBe("hello world");
  });

  it("converts © to (C)", () => {
    expect(normalizeToAscii("Copyright © 2024")).toBe("Copyright (C) 2024");
    expect(normalizeToAscii("© Bible")).toBe("(C) Bible");
  });

  it("converts ® to (R)", () => {
    expect(normalizeToAscii("NIV®")).toBe("NIV(R)");
    expect(normalizeToAscii("Version (R)")).toBe("Version (R)");
  });

  it("converts © and ® together without interfering with each other", () => {
    expect(normalizeToAscii("Bible © 2024 NIV®")).toBe("Bible (C) 2024 NIV(R)");
  });

  it("converts © before it gets converted by letter patterns", () => {
    expect(normalizeToAscii("\u00A9")).toBe("(C)");
  });

  it("converts ® before it gets converted by letter patterns", () => {
    expect(normalizeToAscii("\u00AE")).toBe("(R)");
  });

  it("converts uppercase accented A characters", () => {
    expect(normalizeToAscii("\u00C0")).toBe("A");
    expect(normalizeToAscii("\u00C1")).toBe("A");
    expect(normalizeToAscii("\u00C2")).toBe("A");
    expect(normalizeToAscii("\u00C3")).toBe("A");
    expect(normalizeToAscii("\u00C4")).toBe("A");
    expect(normalizeToAscii("\u00C5")).toBe("A");
  });

  it("converts lowercase accented a characters", () => {
    expect(normalizeToAscii("\u00E0")).toBe("a");
    expect(normalizeToAscii("\u00E1")).toBe("a");
    expect(normalizeToAscii("\u00E2")).toBe("a");
    expect(normalizeToAscii("\u00E3")).toBe("a");
    expect(normalizeToAscii("\u00E4")).toBe("a");
    expect(normalizeToAscii("\u00E5")).toBe("a");
  });

  it("converts uppercase accented E characters", () => {
    expect(normalizeToAscii("\u00C8")).toBe("E");
    expect(normalizeToAscii("\u00C9")).toBe("E");
    expect(normalizeToAscii("\u00CA")).toBe("E");
    expect(normalizeToAscii("\u00CB")).toBe("E");
  });

  it("converts lowercase accented e characters", () => {
    expect(normalizeToAscii("\u00E8")).toBe("e");
    expect(normalizeToAscii("\u00E9")).toBe("e");
    expect(normalizeToAscii("\u00EA")).toBe("e");
    expect(normalizeToAscii("\u00EB")).toBe("e");
  });

  it("converts uppercase accented I characters", () => {
    expect(normalizeToAscii("\u00CC")).toBe("I");
    expect(normalizeToAscii("\u00CD")).toBe("I");
    expect(normalizeToAscii("\u00CE")).toBe("I");
    expect(normalizeToAscii("\u00CF")).toBe("I");
  });

  it("converts lowercase accented i characters", () => {
    expect(normalizeToAscii("\u00EC")).toBe("i");
    expect(normalizeToAscii("\u00ED")).toBe("i");
    expect(normalizeToAscii("\u00EE")).toBe("i");
    expect(normalizeToAscii("\u00EF")).toBe("i");
  });

  it("converts Ð and ð", () => {
    expect(normalizeToAscii("\u00D0")).toBe("D");
    expect(normalizeToAscii("\u00F0")).toBe("d");
  });

  it("converts Ñ and ñ", () => {
    expect(normalizeToAscii("\u00D1")).toBe("N");
    expect(normalizeToAscii("\u00F1")).toBe("n");
  });

  it("converts uppercase accented O characters", () => {
    expect(normalizeToAscii("\u00D2")).toBe("O");
    expect(normalizeToAscii("\u00D3")).toBe("O");
    expect(normalizeToAscii("\u00D4")).toBe("O");
    expect(normalizeToAscii("\u00D5")).toBe("O");
    expect(normalizeToAscii("\u00D6")).toBe("O");
    expect(normalizeToAscii("\u00D8")).toBe("O");
  });

  it("converts lowercase accented o characters", () => {
    expect(normalizeToAscii("\u00F2")).toBe("o");
    expect(normalizeToAscii("\u00F3")).toBe("o");
    expect(normalizeToAscii("\u00F4")).toBe("o");
    expect(normalizeToAscii("\u00F5")).toBe("o");
    expect(normalizeToAscii("\u00F6")).toBe("o");
    expect(normalizeToAscii("\u00F8")).toBe("o");
  });

  it("converts uppercase accented U characters", () => {
    expect(normalizeToAscii("\u00D9")).toBe("U");
    expect(normalizeToAscii("\u00DA")).toBe("U");
    expect(normalizeToAscii("\u00DB")).toBe("U");
    expect(normalizeToAscii("\u00DC")).toBe("U");
  });

  it("converts lowercase accented u characters", () => {
    expect(normalizeToAscii("\u00F9")).toBe("u");
    expect(normalizeToAscii("\u00FA")).toBe("u");
    expect(normalizeToAscii("\u00FB")).toBe("u");
    expect(normalizeToAscii("\u00FC")).toBe("u");
  });

  it("converts Ý and ý to uppercase Y", () => {
    expect(normalizeToAscii("\u00DD")).toBe("Y");
    expect(normalizeToAscii("\u00FD")).toBe("Y");
  });

  it("converts ÿ and þ", () => {
    expect(normalizeToAscii("\u00FF")).toBe("y");
    expect(normalizeToAscii("\u00FE")).toBe("y");
  });

  it("converts Ç and ç", () => {
    expect(normalizeToAscii("\u00C7")).toBe("C");
    expect(normalizeToAscii("\u00E7")).toBe("c");
  });

  it("removes remaining non-ASCII characters", () => {
    expect(normalizeToAscii("\u1234\u5678")).toBe("");
    expect(normalizeToAscii("hello\u1234world")).toBe("helloworld");
  });

  it("preserves ASCII characters unchanged", () => {
    expect(normalizeToAscii("Hello World 123!")).toBe("Hello World 123!");
  });

  it("handles a realistic copyright string from API.Bible", () => {
    const input =
      "The Holy Bible, New International Version® NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by Permission";
    const expected =
      "The Holy Bible, New International Version(R) NIV(R) Copyright (C) 1973, 1978, 1984, 2011 by Biblica, Inc.(R) Used by Permission";
    expect(normalizeToAscii(input)).toBe(expected);
  });

  it("handles empty string", () => {
    expect(normalizeToAscii("")).toBe("");
  });

  it("handles string with only non-ASCII characters", () => {
    expect(normalizeToAscii("\u00A9\u00AE\u1234")).toBe("(C)(R)");
  });
});