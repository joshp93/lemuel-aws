const mockSend = jest.fn();

jest.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  GetSecretValueCommand: jest.fn(),
}));

import { getSecret } from "../../../../src/fetch-proverbs-for-version/utils/getSecret";

describe("getSecret", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it("retrieves and parses secret from AWS Secrets Manager", async () => {
    mockSend.mockResolvedValue({
      SecretString: JSON.stringify({
        apiKey: "test-api-key",
        baseUrl: "https://rest.api.bible",
      }),
    });

    const result = await getSecret("test-secret");

    expect(result).toEqual({
      apiKey: "test-api-key",
      baseUrl: "https://rest.api.bible",
    });
  });

  it("throws error when secret name is empty", async () => {
    await expect(getSecret("")).rejects.toThrow(
      "API_BIBLE_SECRET_NAME environment variable not set",
    );
  });

  it("throws error when secret value is empty", async () => {
    mockSend.mockResolvedValue({
      SecretString: undefined,
    });

    await expect(getSecret("test-secret")).rejects.toThrow(
      "Secret value is empty",
    );
  });

  it("throws error when secret is not valid JSON", async () => {
    mockSend.mockResolvedValue({
      SecretString: "not valid json",
    });

    await expect(getSecret("test-secret")).rejects.toThrow();
  });
});
