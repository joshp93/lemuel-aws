import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { LemuelSecretStack } from "../../lib/lemuel-secret-stack";

describe("LemuelSecretStack", () => {
  it("should create a Secrets Manager secret", () => {
    const app = new cdk.App();
    const stack = new LemuelSecretStack(app, "TestStack");
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::SecretsManager::Secret", {
      Name: "api-bible-creds",
    });
  });
});
