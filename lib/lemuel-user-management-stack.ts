import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import type { Construct } from "constructs";

export class LemuelUserManagementStack extends cdk.Stack {
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;
  readonly userPoolDomain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, "lemuel-user-pool", {
      userPoolName: "lemuel-user-pool",
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      signInPolicy: {
        allowedFirstAuthFactors: {
          password: true,
        },
      },
    });

    this.userPoolClient = new cognito.UserPoolClient(
      this,
      "lemuel-web-client",
      {
        userPool: this.userPool,
        authFlows: {
          userPassword: true,
        },
        generateSecret: false,
      },
    );

    this.userPoolDomain = new cognito.UserPoolDomain(this, "lemuel-domain", {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix: "lemuel",
      },
    });
  }
}
