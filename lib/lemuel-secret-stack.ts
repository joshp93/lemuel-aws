import * as cdk from "aws-cdk-lib";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";

export class LemuelSecretStack extends cdk.Stack {
  readonly apiBibleSecretName: string;
  readonly fcmSecretName: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const apiBibleSecret = new secretsmanager.Secret(this, "api-bible-secret", {
      secretName: "api-bible-creds",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.apiBibleSecretName = apiBibleSecret.secretName;

    const fcmSecret = new secretsmanager.Secret(this, "fcm-server-secret", {
      secretName: "fcm-server-creds",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.fcmSecretName = fcmSecret.secretName;
  }
}
