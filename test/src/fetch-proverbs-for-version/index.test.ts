const mockSend = jest.fn();
jest.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  GetSecretValueCommand: jest.fn(),
}));

global.fetch = jest.fn();
const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

describe("fetch-proverbs-for-version handler", () => {
  let handler: typeof import("../../../src/fetch-proverbs-for-version/index").handler;

  beforeAll(() => {
    process.env.API_BIBLE_SECRET_NAME = "test-secret";
  });

  beforeEach(() => {
    mockSend.mockReset();
    fetchMock.mockReset();
    jest.resetModules();
  });

  it("Should fetch proverbs from API.Bible using bible ID from bibles endpoint", async () => {
    handler = require("../../../src/fetch-proverbs-for-version/index").handler;

    mockSend.mockResolvedValue({
      SecretString: JSON.stringify({
        apiKey: "test-api-key",
        baseUrl: "https://rest.api.bible",
      }),
    });

    const biblesResponse = {
      data: [
        {
          id: "WEB-BIBLE-ID",
          abbreviation: "web",
          abbreviationLocal: "WEB",
          name: "World English Bible",
        },
        {
          id: "NIV-BIBLE-ID",
          abbreviation: "niv11",
          abbreviationLocal: "NIV",
          name: "New International Version",
        },
      ],
    };

    const chapterFetchResults: Record<
      number,
      Array<{
        name?: string;
        type?: string;
        attrs?: Record<string, unknown>;
        items?: Array<{
          text?: string;
          type?: string;
          attrs?: Record<string, unknown>;
        }>;
      }>
    > = {
      10: [
        {
          type: "tag",
          name: "para",
          attrs: { style: "p" },
          items: [
            {
              type: "text",
              text: "The proverbs of Solomon.",
              attrs: { verseId: "PRO.10.1" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q1", vid: "PRO 10:1" },
          items: [
            {
              type: "text",
              text: "A wise son makes a glad father;",
              attrs: { verseId: "PRO.10.1" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q2", vid: "PRO 10:1" },
          items: [
            {
              type: "text",
              text: "but a foolish son brings grief to his mother.",
              attrs: { verseId: "PRO.10.1" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q1" },
          items: [
            {
              type: "text",
              text: "Treasures of wickedness profit nothing,",
              attrs: { verseId: "PRO.10.2" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q2", vid: "PRO 10:2" },
          items: [
            {
              type: "text",
              text: "but righteousness delivers from death.",
              attrs: { verseId: "PRO.10.2" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q1" },
          items: [
            {
              type: "text",
              text: "Yahweh will not allow the soul of the righteous to go hungry,",
              attrs: { verseId: "PRO.10.3" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q2", vid: "PRO 10:3" },
          items: [
            {
              type: "text",
              text: "but he thrusts away the desire of the wicked.",
              attrs: { verseId: "PRO.10.3" },
            },
          ],
        },
      ],
      11: [
        {
          type: "tag",
          name: "para",
          attrs: { style: "q1", vid: "PRO 11:1" },
          items: [
            {
              type: "text",
              text: "A false balance is abomination to Yahweh.",
              attrs: { verseId: "PRO.11.1" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q2", vid: "PRO 11:2" },
          items: [
            {
              type: "text",
              text: "When pride comes, then comes shame.",
              attrs: { verseId: "PRO.11.2" },
            },
          ],
        },
      ],
      12: [
        {
          type: "tag",
          name: "para",
          attrs: { style: "q1", vid: "PRO 12:1" },
          items: [
            {
              type: "text",
              text: "Whoso loves instruction loves knowledge.",
              attrs: { verseId: "PRO.12.1" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q2", vid: "PRO 12:2" },
          items: [
            {
              type: "text",
              text: "A good man obtains favor of Yahweh.",
              attrs: { verseId: "PRO.12.2" },
            },
          ],
        },
      ],
      13: [
        {
          type: "tag",
          name: "para",
          attrs: { style: "q1", vid: "PRO 13:1" },
          items: [
            {
              type: "text",
              text: "A wise son hears his father's instruction.",
              attrs: { verseId: "PRO.13.1" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q2", vid: "PRO 13:2" },
          items: [
            {
              type: "text",
              text: "A man shall eat good by the fruit of his mouth.",
              attrs: { verseId: "PRO.13.2" },
            },
          ],
        },
      ],
      14: [
        {
          type: "tag",
          name: "para",
          attrs: { style: "q1", vid: "PRO 14:1" },
          items: [
            {
              type: "text",
              text: "Every wise woman builds her house.",
              attrs: { verseId: "PRO.14.1" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q2", vid: "PRO 14:2" },
          items: [
            {
              type: "text",
              text: "He that walks in his uprightness fears Yahweh.",
              attrs: { verseId: "PRO.14.2" },
            },
          ],
        },
      ],
      15: [
        {
          type: "tag",
          name: "para",
          attrs: { style: "q1", vid: "PRO 15:1" },
          items: [
            {
              type: "text",
              text: "A soft answer turns away wrath.",
              attrs: { verseId: "PRO.15.1" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q2", vid: "PRO 15:2" },
          items: [
            {
              type: "text",
              text: "The tongue of the wise uses knowledge aright.",
              attrs: { verseId: "PRO.15.2" },
            },
          ],
        },
      ],
      16: [
        {
          type: "tag",
          name: "para",
          attrs: { style: "q1", vid: "PRO 16:1" },
          items: [
            {
              type: "text",
              text: "The preparations of the heart in man, and the answer of the tongue, is from Yahweh.",
              attrs: { verseId: "PRO.16.1" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q2", vid: "PRO 16:2" },
          items: [
            {
              type: "text",
              text: "All the ways of a man are clean in his own eyes.",
              attrs: { verseId: "PRO.16.2" },
            },
          ],
        },
      ],
      17: [
        {
          type: "tag",
          name: "para",
          attrs: { style: "q1", vid: "PRO 17:1" },
          items: [
            {
              type: "text",
              text: "Better is a dry morsel, and quietness therewith, than a house full of sacrifices with strife.",
              attrs: { verseId: "PRO.17.1" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q2", vid: "PRO 17:2" },
          items: [
            {
              type: "text",
              text: "A wise servant shall have rule over a son that causes shame.",
              attrs: { verseId: "PRO.17.2" },
            },
          ],
        },
      ],
      18: [
        {
          type: "tag",
          name: "para",
          attrs: { style: "q1", vid: "PRO 18:1" },
          items: [
            {
              type: "text",
              text: "Through desire a man, having separated himself, seeks and intermeddleth with all wisdom.",
              attrs: { verseId: "PRO.18.1" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q2", vid: "PRO 18:2" },
          items: [
            {
              type: "text",
              text: "A fool has no delight in understanding.",
              attrs: { verseId: "PRO.18.2" },
            },
          ],
        },
      ],
      19: [
        {
          type: "tag",
          name: "para",
          attrs: { style: "q1", vid: "PRO 19:1" },
          items: [
            {
              type: "text",
              text: "Better is the poor that walks in his integrity, than he that is perverse in his lips, and is a fool.",
              attrs: { verseId: "PRO.19.1" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q2", vid: "PRO 19:2" },
          items: [
            {
              type: "text",
              text: "Also, that the soul be without knowledge, it is not good.",
              attrs: { verseId: "PRO.19.2" },
            },
          ],
        },
      ],
      20: [
        {
          type: "tag",
          name: "para",
          attrs: { style: "q1", vid: "PRO 20:1" },
          items: [
            {
              type: "text",
              text: "Wine is a mocker, strong drink is raging.",
              attrs: { verseId: "PRO.20.1" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q2", vid: "PRO 20:2" },
          items: [
            {
              type: "text",
              text: "The terror of a king is as the roaring of a lion.",
              attrs: { verseId: "PRO.20.2" },
            },
          ],
        },
      ],
      21: [
        {
          type: "tag",
          name: "para",
          attrs: { style: "q1", vid: "PRO 21:1" },
          items: [
            {
              type: "text",
              text: "The king's heart is in the hand of Yahweh, as the rivers of water.",
              attrs: { verseId: "PRO.21.1" },
            },
          ],
        },
        {
          type: "tag",
          name: "para",
          attrs: { style: "q2", vid: "PRO 21:2" },
          items: [
            {
              type: "text",
              text: "Every way of a man is right in his own eyes.",
              attrs: { verseId: "PRO.21.2" },
            },
          ],
        },
      ],
    };

    fetchMock.mockImplementation(async (url: string | URL | Request) => {
      const urlStr = url.toString();

      if (urlStr.includes("/bibles?language=eng")) {
        return new Response(JSON.stringify(biblesResponse), {
          status: 200,
        });
      }

      if (urlStr.includes("/chapters/PRO.")) {
        const chapterMatch = urlStr.match(/\/chapters\/PRO\.(\d+)/);
        if (!chapterMatch) {
          return new Response(JSON.stringify({ data: { content: [] } }), {
            status: 400,
          });
        }
        const chapter = parseInt(chapterMatch[1], 10);
        const content = chapterFetchResults[chapter] || [];

        return new Response(JSON.stringify({ data: { content } }), {
          status: 200,
        });
      }

      return new Response(JSON.stringify({ data: {} }), { status: 404 });
    });

    const consoleLogSpy = jest.spyOn(console, "log");

    const result = await handler({ version: "web" });

    expect(consoleLogSpy).toHaveBeenCalled();
    expect(typeof result).toBe("object");

    const output = result as any;

    expect(output.version).toBe("web");
    expect(Array.isArray(output.proverbs)).toBe(true);
    expect(output.proverbs.length).toBeGreaterThan(0);

    const firstProverb = output.proverbs[0];
    expect(firstProverb).toHaveProperty("ref");
    expect(firstProverb).toHaveProperty("proverb");
    expect(firstProverb.ref).toMatch(/^Proverbs \d+:\d+/);

    const biblesCall = fetchMock.mock.calls.find(
      (call) =>
        call[0].toString().includes("/bibles") &&
        !call[0].toString().includes("/passages"),
    );
    expect(biblesCall).toBeDefined();
    const headers = biblesCall![1]?.headers as Record<string, string>;
    expect(headers?.["api-key"]).toBe("test-api-key");
  }, 30000);

  it("Should throw if version is not provided", async () => {
    jest.resetModules();
    handler = require("../../../src/fetch-proverbs-for-version/index").handler;

    await expect(handler({} as { version: string })).rejects.toThrow(
      "Invalid input",
    );
  });

  it("Should throw if API_BIBLE_SECRET_NAME is not set", async () => {
    delete process.env.API_BIBLE_SECRET_NAME;
    jest.resetModules();
    handler = require("../../../src/fetch-proverbs-for-version/index").handler;

    await expect(handler({ version: "web" })).rejects.toThrow(
      "API_BIBLE_SECRET_NAME environment variable not set",
    );
  });

  it("Should throw if bible version not found", async () => {
    jest.resetModules();
    process.env.API_BIBLE_SECRET_NAME = "test-secret";
    handler = require("../../../src/fetch-proverbs-for-version/index").handler;

    mockSend.mockResolvedValue({
      SecretString: JSON.stringify({
        apiKey: "test-api-key",
        baseUrl: "https://rest.api.bible",
      }),
    });

    fetchMock.mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "WEB-BIBLE-ID",
              abbreviation: "web",
              abbreviationLocal: "WEB",
              name: "World English Bible",
            },
          ],
        }),
        { status: 200 },
      );
    });

    await expect(handler({ version: "nonexistent" })).rejects.toThrow(
      'Bible version "nonexistent" not found',
    );
  });
});
