import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { LemuelStack } from "../../lib/lemuel-stack";
import { LemuelUserManagementStack } from "../../lib/lemuel-user-management-stack";

const createStack = () => {
  const app = new cdk.App();
  const userManagementStack = new LemuelUserManagementStack(app, "UserMgmt");
  const stack = new LemuelStack(app, "TestStack", {
    userPool: userManagementStack.userPool,
    apiBibleSecretName: "test-api-bible-creds",
    fcmSecretName: "fcm-server-creds",
  });
  return Template.fromStack(stack);
};

describe("LemuelStack", () => {
  it("should match snapshot", () => {
    const template = createStack();
    expect(template.toJSON()).toMatchSnapshot();
  });

  it("should create a DynamoDB table for proverbs", () => {
    const template = createStack();

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "proverbs-store",
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    });
  });

  it("should create a DynamoDB stream on the table", () => {
    const template = createStack();

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "proverbs-store",
      StreamSpecification: {
        StreamViewType: "NEW_IMAGE",
      },
    });
  });

  it("should create device-notif-index GSI", () => {
    const template = createStack();

    const tables = template.findResources("AWS::DynamoDB::Table");
    const table = tables.proverbsstore7682A597;
    const gsis = table.Properties.GlobalSecondaryIndexes as Record<string, unknown>[];
    const index = gsis.find((gsi) => gsi.IndexName === "device-notif-index");

    expect(index).toBeDefined();
    expect(index!.KeySchema).toEqual([
      { AttributeName: "pk", KeyType: "HASH" },
      { AttributeName: "notificationsEnabled", KeyType: "RANGE" },
    ]);
  });

  it("should create Lambda functions for all handlers", () => {
    const template = createStack();

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "choose-proverb",
      Runtime: "nodejs22.x",
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "get-proverb",
      Runtime: "nodejs22.x",
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "get-proverbs",
      Runtime: "nodejs22.x",
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "load-proverbs",
      Runtime: "nodejs22.x",
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "check-user-exists",
      Runtime: "nodejs22.x",
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "account-handler",
      Runtime: "nodejs22.x",
    });
  });

  it("should create push notification Lambda functions", () => {
    const template = createStack();

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "create-device-notif-config",
      Runtime: "nodejs22.x",
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "push-daily-proverb",
      Runtime: "nodejs22.x",
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "push-daily-notification",
      Runtime: "nodejs22.x",
    });
  });

  it("should create a REST API with auth endpoints", () => {
    const template = createStack();

    template.hasResourceProperties("AWS::ApiGateway::RestApi", {
      Name: "lemuel-api",
    });
  });

  it("should create CreateDeviceNotificationConfigModel", () => {
    const template = createStack();

    template.hasResourceProperties("AWS::ApiGateway::Model", {
      Name: "CreateDeviceNotificationConfigModel",
    });
  });

  it("should create POST /notifications/config endpoint", () => {
    const template = createStack();

    template.hasResourceProperties("AWS::ApiGateway::Resource", {
      PathPart: "notifications",
    });

    template.hasResourceProperties("AWS::ApiGateway::Resource", {
      PathPart: "config",
    });

    template.hasResourceProperties("AWS::ApiGateway::Method", {
      HttpMethod: "POST",
      AuthorizationType: "NONE",
    });
  });

  it("should create an EventBridge rule for daily schedule", () => {
    const template = createStack();

    template.hasResourceProperties("AWS::Events::Rule", {
      Name: "lemuel-schedule",
      ScheduleExpression: "cron(0 0 * * ? *)",
      State: "ENABLED",
    });
  });

  it("should create an EventBridge rule for midday notification", () => {
    const template = createStack();

    template.hasResourceProperties("AWS::Events::Rule", {
      Name: "lemuel-midday-notification",
      ScheduleExpression: "cron(0 12 * * ? *)",
      State: "ENABLED",
    });
  });

  it("should create a DynamoDB event source mapping for push-daily-proverb", () => {
    const template = createStack();

    template.hasResourceProperties("AWS::Lambda::EventSourceMapping", {
      FilterCriteria: {
        Filters: [
          {
            Pattern: JSON.stringify({
              eventName: ["INSERT"],
            }),
          },
        ],
      },
    });
  });

  it("should grant check-user-exists Lambda permission to call AdminGetUser", () => {
    const template = createStack();

    // Verify that an IAM policy for cognito-idp:AdminGetUser is created
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          {
            Effect: "Allow",
            Action: "cognito-idp:AdminGetUser",
          },
        ],
      },
    });
  });
});
