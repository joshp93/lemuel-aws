import * as cdk from "aws-cdk-lib";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export class LemuelSecretStack extends cdk.Stack {
  readonly apiBibleSecretName: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const apiBibleSecret = new secretsmanager.Secret(this, "api-bible-secret", {
      secretName: "api-bible-creds",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.apiBibleSecretName = apiBibleSecret.secretName;
  }
}
