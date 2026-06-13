import {
  BibleNotFoundError,
  fetchBible,
} from "../../../../src/fetch-proverbs-for-version/utils/fetchBible";

global.fetch = jest.fn();

describe("fetchBible", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  it("fetches bible by version abbreviation", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: "WEB-BIBLE-ID",
              abbreviation: "web",
              abbreviationLocal: "WEB",
              name: "World English Bible",
            },
          ],
        }),
      text: () => Promise.resolve(""),
    });

    const result = await fetchBible(
      "https://rest.api.bible",
      "test-key",
      "web",
    );

    expect(result.id).toBe("WEB-BIBLE-ID");
    expect(result.abbreviation).toBe("web");
  });

  it("throws BibleNotFoundError when version not found", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: "WEB-BIBLE-ID",
              abbreviation: "web",
              name: "World English Bible",
            },
          ],
        }),
      text: () => Promise.resolve(""),
    });

    await expect(
      fetchBible("https://rest.api.bible", "test-key", "nonexistent"),
    ).rejects.toThrow(BibleNotFoundError);
  });

  it("throws error when fetch fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: () => Promise.resolve("Server error"),
    });

    await expect(
      fetchBible("https://rest.api.bible", "test-key", "web"),
    ).rejects.toThrow("Failed to fetch bibles");
  });

  it("handles case-insensitive version matching", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: "NIV-BIBLE-ID",
              abbreviation: "niv",
              abbreviationLocal: "NIV",
              name: "New International Version",
            },
          ],
        }),
      text: () => Promise.resolve(""),
    });

    const result = await fetchBible(
      "https://rest.api.bible",
      "test-key",
      "NIV",
    );

    expect(result.id).toBe("NIV-BIBLE-ID");
  });

  it("includes available versions in error message", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            { id: "kjv-id", abbreviation: "kjv", name: "KJV" },
            { id: "web-id", abbreviation: "web", name: "WEB" },
          ],
        }),
      text: () => Promise.resolve(""),
    });

    try {
      await fetchBible("https://rest.api.bible", "test-key", "invalid");
      fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(BibleNotFoundError);
      expect((error as BibleNotFoundError).availableVersions).toContain("kjv");
      expect((error as BibleNotFoundError).availableVersions).toContain("web");
    }
  });
});
