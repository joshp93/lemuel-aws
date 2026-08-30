import type { WidgetRenderRequest } from "@use-voltra/android-server";
import { renderProverbWidget } from "../../../src/server-widget-handler/proverbWidget";

jest.mock("../../../src/server-widget-handler/fetchTodayProverb", () => ({
  fetchTodayProverb: jest.fn(),
}));

import { fetchTodayProverb } from "../../../src/server-widget-handler/fetchTodayProverb";

const mockFetch = fetchTodayProverb as jest.MockedFunction<
  typeof fetchTodayProverb
>;

describe("renderProverbWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ref: "Proverbs 3:5",
      proverb: "Trust in the LORD with all your heart",
      citation: "New International Version",
    });
  });

  const makeRequest = (
    headers: Record<string, string | string[] | undefined> = {},
  ): WidgetRenderRequest => ({
    url: new URL("https://widget.lemuel.app/widgets/render"),
    widgetId: "proverb_widget",
    platform: "android",
    theme: "light",
    headers,
  });

  it("extracts the bible version from the X-Bible-Version header", async () => {
    const req = makeRequest({ "x-bible-version": "kjv" });

    await renderProverbWidget(req);

    expect(mockFetch).toHaveBeenCalledWith("kjv");
  });

  it("defaults to niv when no X-Bible-Version header is present", async () => {
    const req = makeRequest({});

    await renderProverbWidget(req);

    expect(mockFetch).toHaveBeenCalledWith("niv");
  });

  it("defaults to niv when X-Bible-Version is an array", async () => {
    const req = makeRequest({ "x-bible-version": ["kjv", "nlt"] });

    await renderProverbWidget(req);

    expect(mockFetch).toHaveBeenCalledWith("niv");
  });

  it("returns size variants in the correct shape", async () => {
    const req = makeRequest({ "x-bible-version": "niv" });

    const result = await renderProverbWidget(req);

    expect(result).toHaveLength(3);
    for (const variant of result) {
      expect(variant).toHaveProperty("size");
      expect(variant.size).toHaveProperty("width");
      expect(variant.size).toHaveProperty("height");
      expect(variant).toHaveProperty("content");
    }
  });

  it("includes the standard 250x250 size variant", async () => {
    const req = makeRequest();

    const result = await renderProverbWidget(req);

    const matches = result.filter(
      (v) => v.size.width === 250 && v.size.height === 250,
    );
    expect(matches).toHaveLength(1);
  });
});
