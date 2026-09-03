const mockCreateHandler = jest.fn<object, [object]>(
  (opts?: object) => opts ?? {},
);

jest.mock("@use-voltra/android-server", () => ({
  createAndroidWidgetUpdateHandler: mockCreateHandler,
}));

jest.mock("../../../src/server-widget-handler/proverbWidget", () => ({
  renderProverbWidget: jest.fn(),
}));

describe("getWidgetHandler", () => {
  let getWidgetHandler: () => unknown;

  beforeEach(() => {
    mockCreateHandler.mockClear();
    jest.resetModules();

    getWidgetHandler =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../../../src/server-widget-handler/getWidgetHandler").getWidgetHandler;
  });

  it("creates the handler with the render function on first call", () => {
    const handler = getWidgetHandler();

    expect(mockCreateHandler).toHaveBeenCalledTimes(1);
    const opts = mockCreateHandler.mock.lastCall![0] as Record<string, unknown>;
    expect(opts.render).toBeDefined();
    expect(opts.validateToken).toBeUndefined();
    expect(handler).toBeDefined();
  });

  it("returns the cached handler on subsequent calls without re-creating", () => {
    const handler1 = getWidgetHandler();
    mockCreateHandler.mockClear();
    const handler2 = getWidgetHandler();

    expect(mockCreateHandler).toHaveBeenCalledTimes(0);
    expect(handler1).toBe(handler2);
  });
});
