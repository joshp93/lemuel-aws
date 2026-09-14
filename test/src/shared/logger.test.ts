import { Logger } from "@aws-lambda-powertools/logger";
import { logger } from "../../../src/shared/logger";

const mockUuid = "76a202a4-70b1-702b-86b5-97ce097605b3";

const mockInstance = jest.mocked(Logger.prototype);

beforeEach(() => {
  mockInstance.debug.mockClear();
  mockInstance.info.mockClear();
  mockInstance.warn.mockClear();
  mockInstance.error.mockClear();
});

describe("logger wrapper", () => {
  describe("truncates UUID values in context objects", () => {
    it("truncates uuid field", () => {
      logger.info("test", { uuid: mockUuid });
      expect(mockInstance.info).toHaveBeenCalledWith("test", {
        uuid: "76a202a4...",
      });
    });

    it("truncates any UUID-like string value", () => {
      logger.info("test", { userId: mockUuid, ref: "Proverbs3:5" });
      expect(mockInstance.info).toHaveBeenCalledWith("test", {
        userId: "76a202a4...",
        ref: "Proverbs3:5",
      });
    });

    it("leaves short strings intact", () => {
      logger.info("test", { count: 3, status: "ok" });
      expect(mockInstance.info).toHaveBeenCalledWith("test", {
        count: 3,
        status: "ok",
      });
    });
  });

  describe("truncates token properties", () => {
    it("truncates a property named token", () => {
      logger.info("test", { token: "full-fcm-device-token-string-value" });
      expect(mockInstance.info).toHaveBeenCalledWith("test", {
        token: "full-fcm...",
      });
    });

    it("does not truncate similar property names", () => {
      logger.info("test", {
        tokenId: "some-other-value",
        accessToken: "also-not-truncated",
      });
      expect(mockInstance.info).toHaveBeenCalledWith("test", {
        tokenId: "some-other-value",
        accessToken: "also-not-truncated",
      });
    });
  });

  describe("handles Error extras", () => {
    it("passes Error objects through unchanged", () => {
      const error = new Error("something broke");
      logger.error("fail", error);
      expect(mockInstance.error).toHaveBeenCalledWith("fail", error);
    });
  });

  describe("handles string extras", () => {
    it("truncates a UUID-like string extra", () => {
      logger.info("lookup", mockUuid);
      expect(mockInstance.info).toHaveBeenCalledWith("lookup", "76a202a4...");
    });

    it("passes through plain string extras", () => {
      logger.info("lookup", "user-123");
      expect(mockInstance.info).toHaveBeenCalledWith("lookup", "user-123");
    });
  });

  describe("handles no extra argument", () => {
    it("calls through with just a message", () => {
      logger.info("hello");
      expect(mockInstance.info).toHaveBeenCalledWith("hello");
    });
  });

  describe("all log levels work", () => {
    it("debug level", () => {
      logger.debug("verbose", { details: mockUuid });
      expect(mockInstance.debug).toHaveBeenCalledWith("verbose", {
        details: "76a202a4...",
      });
    });

    it("warn level", () => {
      logger.warn("caution", { uuid: mockUuid });
      expect(mockInstance.warn).toHaveBeenCalledWith("caution", {
        uuid: "76a202a4...",
      });
    });

    it("error level", () => {
      logger.error("oh no", { uuid: mockUuid });
      expect(mockInstance.error).toHaveBeenCalledWith("oh no", {
        uuid: "76a202a4...",
      });
    });

    it("error level with Error instance", () => {
      const err = new Error("crash");
      logger.error("oh no", err);
      expect(mockInstance.error).toHaveBeenCalledWith("oh no", err);
    });
  });
});
