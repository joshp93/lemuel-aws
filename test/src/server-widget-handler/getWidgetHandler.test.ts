const mockSecretsSend = jest.fn();

jest.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({
    send: mockSecretsSend,
    destroy: jest.fn(),
  })),
  GetSecretValueCommand: jest.fn(),
}));

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
  let getWidgetHandler: () => Promise<unknown>;

  beforeEach(() => {
    mockSecretsSend.mockReset();
    mockCreateHandler.mockClear();
    jest.resetModules();

    process.env.WIDGET_SERVER_SECRET_NAME = "widget-server-credentials";

    getWidgetHandler =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../../../src/server-widget-handler/getWidgetHandler").getWidgetHandler;
  });

  it("fetches the secret and creates the handler on first call", async () => {
    mockSecretsSend.mockResolvedValue({ SecretString: "test-hmac-secret" });

    await getWidgetHandler();

    expect(mockSecretsSend).toHaveBeenCalledTimes(1);
    expect(mockCreateHandler).toHaveBeenCalledTimes(1);
  });

  it("validates tokens against the fetched secret", async () => {
    mockSecretsSend.mockResolvedValue({ SecretString: "correct-hmac" });

    await getWidgetHandler();

    const opts = mockCreateHandler.mock.lastCall![0] as {
      validateToken: (t: string) => boolean;
    };
    expect(opts.validateToken("correct-hmac")).toBe(true);
    expect(opts.validateToken("wrong-hmac")).toBe(false);
  });

  it("returns the cached handler on subsequent calls without re-fetching", async () => {
    mockSecretsSend.mockResolvedValue({ SecretString: "secret1" });

    await getWidgetHandler();
    mockSecretsSend.mockClear();
    mockCreateHandler.mockClear();
    await getWidgetHandler();

    expect(mockSecretsSend).toHaveBeenCalledTimes(0);
    expect(mockCreateHandler).toHaveBeenCalledTimes(0);
  });

  it("treats empty SecretString as empty string for token comparison", async () => {
    mockSecretsSend.mockResolvedValue({ SecretString: "" });

    await getWidgetHandler();

    const opts = mockCreateHandler.mock.lastCall![0] as {
      validateToken: (t: string) => boolean;
    };
    expect(opts.validateToken("")).toBe(true);
    expect(opts.validateToken("anything-else")).toBe(false);
  });

  it("defaults secret to empty string when SecretString is missing", async () => {
    mockSecretsSend.mockResolvedValue({});

    await getWidgetHandler();

    const opts = mockCreateHandler.mock.lastCall![0] as {
      validateToken: (t: string) => boolean;
    };
    expect(opts.validateToken("")).toBe(true);
  });
});
