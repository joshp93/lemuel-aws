import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

interface LemuelStackProps extends cdk.StackProps {
  userPoolId: string;
  apiBibleSecretName: string;
}

export class LemuelStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LemuelStackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "proverbs-store", {
      tableName: "proverbs-store",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    table.addGlobalSecondaryIndex({
      indexName: "version-index",
      partitionKey: { name: "version", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
    });

    const fetchProverbsForVersion = new lambda.Function(
      this,
      "fetch-proverbs-for-version",
      {
        functionName: "fetch-proverbs-for-version",
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset("dist/fetch-proverbs-for-version"),
        environment: {
          API_BIBLE_SECRET_NAME: props.apiBibleSecretName,
        },
        timeout: cdk.Duration.minutes(1),
      },
    );

    secretsmanager.Secret.fromSecretNameV2(
      this,
      "imported-api-bible-secret",
      props.apiBibleSecretName,
    ).grantRead(fetchProverbsForVersion);

    const chooseProverb = new lambda.Function(this, "choose-proverb", {
      functionName: "choose-proverb",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("dist/choose-proverb"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const getProverb = new lambda.Function(this, "get-proverb", {
      functionName: "get-proverb",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("dist/get-proverb"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const checkUserExists = new lambda.Function(this, "check-user-exists", {
      functionName: "check-user-exists",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("dist/check-user-exists"),
      environment: {
        USER_POOL_ID: props.userPoolId,
      },
    });

    // Grant Lambda permission to query Cognito User Pool using AdminGetUser
    checkUserExists.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["cognito-idp:AdminGetUser"],
        resources: [
          `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${props.userPoolId}`,
        ],
      }),
    );

    const api = new apigateway.RestApi(this, "lemuel-api", {
      restApiName: "lemuel-api",
      deployOptions: {
        dataTraceEnabled: false,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    const getAvailableVersions = new lambda.Function(
      this,
      "get-available-versions",
      {
        functionName: "get-available-versions",
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset("dist/get-available-versions"),
        environment: {
          TABLE_NAME: table.tableName,
        },
      },
    );

    table.grantReadData(getAvailableVersions);

    api.root
      .addResource("available-versions")
      .addMethod(
        "GET",
        new apigateway.LambdaIntegration(getAvailableVersions),
        {
          authorizationType: apigateway.AuthorizationType.NONE,
        },
      );

    api.root
      .addResource("{version}")
      .addMethod("GET", new apigateway.LambdaIntegration(getProverb), {
        authorizationType: apigateway.AuthorizationType.NONE,
      });

    // Add auth endpoints with rate limiting
    const authResource = api.root.addResource("auth");
    const checkUserExistsResource =
      authResource.addResource("check-user-exists");

    checkUserExistsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(checkUserExists),
      {
        authorizationType: apigateway.AuthorizationType.NONE,
        methodResponses: [
          {
            statusCode: "200",
          },
          {
            statusCode: "400",
          },
          {
            statusCode: "429",
          },
          {
            statusCode: "500",
          },
        ],
      },
    );

    // Create usage plan with rate limiting to prevent user enumeration
    const apiKey = api.addApiKey("CheckUserExistsKey", {
      apiKeyName: "check-user-exists-key",
    });

    const usagePlan = api.addUsagePlan("CheckUserExistsUsagePlan", {
      name: "check-user-exists-rate-limit",
      description: "Rate limiting for check-user-exists endpoint",
      throttle: {
        rateLimit: 10, // 10 requests per second
        burstLimit: 20, // Allow burst of up to 20
      },
      quota: {
        limit: 10000, // 10k requests per day
        period: apigateway.Period.DAY,
      },
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: api.deploymentStage,
    });

    const loadProverbsLambda = new lambda.Function(this, "load-proverbs", {
      functionName: "load-proverbs",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("dist/load-proverbs"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(chooseProverb);
    table.grantReadWriteData(loadProverbsLambda);
    table.grantReadData(getProverb);

    new events.Rule(this, "lemuel-schedule", {
      ruleName: "lemuel-schedule",
      schedule: events.Schedule.cron({ minute: "0", hour: "0" }),
      targets: [new targets.LambdaFunction(chooseProverb)],
    });
  }
}
