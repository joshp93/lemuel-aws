import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { LemuelStack } from "../../lib/lemuel-stack";
import { LemuelUserManagementStack } from "../../lib/lemuel-user-management-stack";

describe("LemuelStack", () => {
  it("should match snapshot", () => {
    const app = new cdk.App();
    const userManagementStack = new LemuelUserManagementStack(app, "UserMgmt");
    const stack = new LemuelStack(app, "TestStack", {
      userPoolId: userManagementStack.userPool.userPoolId,
      apiBibleSecretName: "test-api-bible-creds",
    });
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });

  it("should create a DynamoDB table for proverbs", () => {
    const app = new cdk.App();
    const userManagementStack = new LemuelUserManagementStack(app, "UserMgmt");
    const stack = new LemuelStack(app, "TestStack", {
      userPoolId: userManagementStack.userPool.userPoolId,
      apiBibleSecretName: "test-api-bible-creds",
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "proverbs-store",
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    });
  });

  it("should create Lambda functions for choose-proverb, get-proverb, load-proverbs, and check-user-exists", () => {
    const app = new cdk.App();
    const userManagementStack = new LemuelUserManagementStack(app, "UserMgmt");
    const stack = new LemuelStack(app, "TestStack", {
      userPoolId: userManagementStack.userPool.userPoolId,
      apiBibleSecretName: "test-api-bible-creds",
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "choose-proverb",
      Runtime: "nodejs22.x",
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "get-proverb",
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
  });

  it("should create a REST API with auth endpoints", () => {
    const app = new cdk.App();
    const userManagementStack = new LemuelUserManagementStack(app, "UserMgmt");
    const stack = new LemuelStack(app, "TestStack", {
      userPoolId: userManagementStack.userPool.userPoolId,
      apiBibleSecretName: "test-api-bible-creds",
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::ApiGateway::RestApi", {
      Name: "lemuel-api",
    });
  });

  it("should create an EventBridge rule for daily schedule", () => {
    const app = new cdk.App();
    const userManagementStack = new LemuelUserManagementStack(app, "UserMgmt");
    const stack = new LemuelStack(app, "TestStack", {
      userPoolId: userManagementStack.userPool.userPoolId,
      apiBibleSecretName: "test-api-bible-creds",
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Events::Rule", {
      Name: "lemuel-schedule",
      ScheduleExpression: "cron(0 0 * * ? *)",
      State: "ENABLED",
    });
  });

  it("should grant check-user-exists Lambda permission to call AdminGetUser", () => {
    const app = new cdk.App();
    const userManagementStack = new LemuelUserManagementStack(app, "UserMgmt");
    const stack = new LemuelStack(app, "TestStack", {
      userPoolId: userManagementStack.userPool.userPoolId,
      apiBibleSecretName: "test-api-bible-creds",
    });
    const template = Template.fromStack(stack);

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
