import { handler } from "../../../src/push-daily-proverb/index";

describe("push-daily-proverb handler", () => {
  beforeEach(() => {
    process.env.TABLE_NAME = "TestTable";
    process.env.FCM_SECRET_NAME = "fcm-server-creds";
  });

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const streamEvent = {
    Records: [
      {
        eventName: "INSERT",
        dynamodb: {
          Keys: {
            pk: { S: "daily-proverb" },
            sk: { S: tomorrow },
          },
          NewImage: {
            ref: { S: "Proverbs10:1" },
          },
        },
      },
    ],
  };

  it("returns early when Records is empty", async () => {
    await expect(handler({ Records: [] })).resolves.toBeUndefined();
  });

  it("returns early when eventName is not INSERT", async () => {
    const event = {
      Records: [
        {
          eventName: "MODIFY",
          dynamodb: {
            Keys: {
              pk: { S: "daily-proverb" },
              sk: { S: tomorrow },
            },
          },
        },
      ],
    };

    await expect(handler(event)).resolves.toBeUndefined();
  });

  it("returns early when pk is not daily-proverb", async () => {
    const event = {
      Records: [
        {
          eventName: "INSERT",
          dynamodb: {
            Keys: {
              pk: { S: "some-other-pk" },
              sk: { S: tomorrow },
            },
          },
        },
      ],
    };

    await expect(handler(event)).resolves.toBeUndefined();
  });

  it("returns early when sk is not tomorrow", async () => {
    const event = {
      Records: [
        {
          eventName: "INSERT",
          dynamodb: {
            Keys: {
              pk: { S: "daily-proverb" },
              sk: { S: "2020-01-01" },
            },
          },
        },
      ],
    };

    await expect(handler(event)).resolves.toBeUndefined();
  });

  it("returns early when NewImage.ref is missing", async () => {
    const event = {
      Records: [
        {
          eventName: "INSERT",
          dynamodb: {
            Keys: {
              pk: { S: "daily-proverb" },
              sk: { S: tomorrow },
            },
            NewImage: {},
          },
        },
      ],
    };

    await expect(handler(event)).resolves.toBeUndefined();
  });
});
