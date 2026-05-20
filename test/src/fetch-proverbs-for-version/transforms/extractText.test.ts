import { extractText } from "../../../../src/fetch-proverbs-for-version/transforms/extractText";
import { ContentElement, ContentTextItem } from "../../../../src/fetch-proverbs-for-version/models/apiBible";

describe("extractText", () => {
  it("extracts text from a single text item", () => {
    const items: ContentTextItem[] = [
      { type: "text", text: "Hello world" },
    ];
    expect(extractText(items)).toBe("Hello world");
  });

  it("extracts text from multiple text items with space", () => {
    const items: ContentTextItem[] = [
      { type: "text", text: "Hello" },
      { type: "text", text: "world" },
    ];
    expect(extractText(items)).toBe("Hello world");
  });

  it("extracts text from nested tags", () => {
    const items: ContentElement[] = [
      {
        type: "tag",
        name: "para",
        items: [
          { type: "text", text: "The" },
          {
            type: "tag",
            name: "char",
            attrs: { style: "sc" },
            items: [{ type: "text", text: "Lord" }],
          },
          { type: "text", text: "will not allow" },
        ],
      },
    ];
    expect(extractText(items)).toBe("The Lord will not allow");
  });

  it("extracts text from deeply nested tags", () => {
    const items: (ContentElement | ContentTextItem)[] = [
      {
        type: "tag",
        name: "para",
        items: [
          {
            type: "tag",
            name: "char",
            items: [
              {
                type: "tag",
                name: "char",
                items: [{ type: "text", text: "deeply nested" }],
              },
            ],
          },
        ],
      },
    ];
    expect(extractText(items)).toBe("deeply nested");
  });

  it("handles empty items array", () => {
    expect(extractText([])).toBe("");
  });

  it("handles items with no nested text", () => {
    const items: ContentElement[] = [
      {
        type: "tag",
        name: "para",
        items: [],
      },
    ];
    expect(extractText(items)).toBe("");
  });

  it("handles mixed content with verse attributes", () => {
    const items: (ContentElement | ContentTextItem)[] = [
      {
        type: "tag",
        name: "para",
        items: [
          { type: "text", text: "A wise son", attrs: { verseId: "PRO.10.1" } },
          {
            type: "tag",
            name: "char",
            attrs: { style: "it" },
            items: [{ type: "text", text: "makes" }],
          },
          { type: "text", text: "a glad father." },
        ],
      },
    ];
    expect(extractText(items)).toBe("A wise son makes a glad father.");
  });
});