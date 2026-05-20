import { ChapterFetchError, fetchChapter } from "../../../../src/fetch-proverbs-for-version/utils/fetchChapter";

global.fetch = jest.fn();

describe("fetchChapter", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  it("fetches chapter data for given bible and chapter number", async () => {
    const mockChapterData = {
      data: {
        id: "PRO.10",
        number: "10",
        content: [
          {
            type: "tag",
            name: "para",
            items: [
              { type: "text", text: "The proverbs of Solomon.", attrs: { verseId: "PRO.10.1" } },
            ],
          },
        ],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockChapterData),
      text: () => Promise.resolve(""),
    });

    const result = await fetchChapter(
      "https://rest.api.bible",
      "test-key",
      "bible-123",
      10,
    );

    expect(result.data.id).toBe("PRO.10");
    expect(result.data.number).toBe("10");
    expect(result.data.content).toHaveLength(1);
  });

  it("throws ChapterFetchError when fetch fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: () => Promise.resolve("Chapter not found"),
    });

    await expect(
      fetchChapter("https://rest.api.bible", "test-key", "bible-123", 99),
    ).rejects.toThrow(ChapterFetchError);
  });

  it("includes chapter number in error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: () => Promise.resolve("Not found"),
    });

    try {
      await fetchChapter("https://rest.api.bible", "test-key", "bible-123", 42);
      fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ChapterFetchError);
      expect((error as ChapterFetchError).chapter).toBe(42);
      expect((error as ChapterFetchError).status).toBe(404);
    }
  });

  it("constructs correct URL for chapter", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: "PRO.10", content: [] } }),
      text: () => Promise.resolve(""),
    });

    await fetchChapter("https://rest.api.bible", "test-key", "abc123", 10);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://rest.api.bible/v1/bibles/abc123/chapters/PRO.10?content-type=json",
      {
        headers: { "api-key": "test-key" },
      },
    );
  });
});