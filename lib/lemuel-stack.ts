import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as eventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";
import CreateAccountSchema from "./models/CreateAccountModel.json";
import DeviceTokenSchema from "./models/DeviceTokenModel.json";
import LogSchema from "./models/LogModel.json";
import NoteSchema from "./models/NoteModel.json";
import ReactionSchema from "./models/ReactionModel.json";
import RegisterDeviceTokenSchema from "./models/RegisterDeviceTokenModel.json";
import ReplySchema from "./models/ReplyModel.json";
import UpdateAccountSchema from "./models/UpdateAccountModel.json";

interface LemuelStackProps extends cdk.StackProps {
  userPoolId?: string;
  userPoolArn?: string;
  apiBibleSecretName: string;
  fcmSecretName: string;
}

export class LemuelStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LemuelStackProps) {
    super(scope, id, props);

    // -----------------------------------------------------------
    // DynamoDB Table + GSIs
    // -----------------------------------------------------------
    const table = new dynamodb.Table(this, "proverbs-store", {
      tableName: "proverbs-store",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });

    table.addGlobalSecondaryIndex({
      indexName: "version-index",
      partitionKey: { name: "version", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
    });

    table.addGlobalSecondaryIndex({
      indexName: "proverb-notes-index",
      partitionKey: { name: "ref", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "dateCreated", type: dynamodb.AttributeType.STRING },
    });

    table.addGlobalSecondaryIndex({
      indexName: "user-notes-index",
      partitionKey: { name: "uuid", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "dateCreated", type: dynamodb.AttributeType.STRING },
    });

    table.addGlobalSecondaryIndex({
      indexName: "user-device-tokens-index",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
    });

    // -----------------------------------------------------------
    // Lambda Functions
    // -----------------------------------------------------------
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
          POWERTOOLS_LOG_LEVEL: "INFO",
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
        POWERTOOLS_LOG_LEVEL: "INFO",
      },
    });

    const getProverb = new lambda.Function(this, "get-proverb", {
      functionName: "get-proverb",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("dist/get-proverb"),
      environment: {
        TABLE_NAME: table.tableName,
        POWERTOOLS_LOG_LEVEL: "INFO",
      },
    });

    const getProverbs = new lambda.Function(this, "get-proverbs", {
      functionName: "get-proverbs",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("dist/get-proverbs"),
      environment: {
        TABLE_NAME: table.tableName,
        POWERTOOLS_LOG_LEVEL: "INFO",
      },
    });

    const checkUserExists = new lambda.Function(this, "check-user-exists", {
      functionName: "check-user-exists",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("dist/check-user-exists"),
      environment: {
        POWERTOOLS_LOG_LEVEL: "INFO",
        ...(props.userPoolId ? { USER_POOL_ID: props.userPoolId } : {}),
      },
    });

    if (props.userPoolId) {
      checkUserExists.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["cognito-idp:AdminGetUser"],
          resources: [
            `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${props.userPoolId}`,
          ],
        }),
      );
    }

    const logHandler = new lambda.Function(this, "log-handler", {
      functionName: "log-handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("dist/log-handler"),
      environment: {
        POWERTOOLS_SERVICE_NAME: "lemuel",
        POWERTOOLS_LOG_LEVEL: "DEBUG",
      },
      loggingFormat: lambda.LoggingFormat.JSON,
      systemLogLevelV2: lambda.SystemLogLevel.WARN,
      applicationLogLevelV2: lambda.ApplicationLogLevel.DEBUG,
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
          POWERTOOLS_LOG_LEVEL: "INFO",
        },
      },
    );

    const accountHandler = new lambda.Function(this, "account-handler", {
      functionName: "account-handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("dist/account-handler"),
      environment: {
        TABLE_NAME: table.tableName,
        POWERTOOLS_LOG_LEVEL: "INFO",
        ...(props.userPoolId ? { USER_POOL_ID: props.userPoolId } : {}),
      },
    });

    if (props.userPoolId) {
      accountHandler.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["cognito-idp:AdminDeleteUser"],
          resources: [
            `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${props.userPoolId}`,
          ],
        }),
      );
    }

    const noteHandler = new lambda.Function(this, "note-handler", {
      functionName: "note-handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("dist/note-handler"),
      timeout: cdk.Duration.seconds(10),
      environment: {
        TABLE_NAME: table.tableName,
        FCM_SECRET_NAME: props.fcmSecretName,
        POWERTOOLS_LOG_LEVEL: "INFO",
      },
    });

    const migrateUserUuids = new lambda.Function(this, "migrate-user-uuids", {
      functionName: "migrate-user-uuids",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("dist/migrate-user-uuids"),
      timeout: cdk.Duration.minutes(5),
      environment: {
        TABLE_NAME: table.tableName,
        POWERTOOLS_LOG_LEVEL: "INFO",
      },
    });

    const loadProverbsLambda = new lambda.Function(this, "load-proverbs", {
      functionName: "load-proverbs",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("dist/load-proverbs"),
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: table.tableName,
        POWERTOOLS_LOG_LEVEL: "INFO",
      },
    });

    const registerDeviceToken = new lambda.Function(
      this,
      "register-device-token",
      {
        functionName: "register-device-token",
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset("dist/register-device-token"),
        environment: {
          TABLE_NAME: table.tableName,
          POWERTOOLS_LOG_LEVEL: "INFO",
        },
      },
    );

    const pushDailyProverb = new lambda.Function(this, "push-daily-proverb", {
      functionName: "push-daily-proverb",
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("dist/push-daily-proverb"),
      environment: {
        TABLE_NAME: table.tableName,
        FCM_SECRET_NAME: props.fcmSecretName,
        POWERTOOLS_LOG_LEVEL: "INFO",
      },
      timeout: cdk.Duration.minutes(5),
    });

    const pushAccountNotifications = new lambda.Function(
      this,
      "push-account-notifications",
      {
        functionName: "push-account-notifications",
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset("dist/push-account-notifications"),
        timeout: cdk.Duration.seconds(30),
        environment: {
          TABLE_NAME: table.tableName,
          FCM_SECRET_NAME: props.fcmSecretName,
          POWERTOOLS_LOG_LEVEL: "INFO",
        },
      },
    );

    const serverWidgetHandler = new lambda.Function(
      this,
      "server-widget-handler",
      {
        functionName: "server-widget-handler",
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset("dist/server-widget-handler"),
        environment: {
          TABLE_NAME: table.tableName,
          POWERTOOLS_LOG_LEVEL: "INFO",
        },
      },
    );

    // -----------------------------------------------------------
    // API Gateway
    // -----------------------------------------------------------
    const api = new apigateway.RestApi(this, "lemuel-api", {
      restApiName: "lemuel-api",
      deployOptions: {
        dataTraceEnabled: false,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    const requestValidator = api.addRequestValidator("RequestValidator", {
      requestValidatorName: "lemuel-request-validator",
      validateRequestParameters: true,
    });

    const userPool = props.userPoolArn
      ? cognito.UserPool.fromUserPoolArn(
          this,
          "imported-user-pool",
          props.userPoolArn,
        )
      : undefined;

    const cognitoAuthorizer = userPool
      ? new apigateway.CognitoUserPoolsAuthorizer(this, "CognitoAuthorizer", {
          cognitoUserPools: [userPool],
          authorizerName: "lemuel-cognito-authorizer",
        })
      : undefined;

    const noteModel = api.addModel("NoteModel", {
      contentType: "application/json",
      modelName: "NoteModel",
      schema: NoteSchema as apigateway.JsonSchema,
    });

    const bodyValidator = api.addRequestValidator("BodyValidator", {
      requestValidatorName: "lemuel-body-validator",
      validateRequestBody: true,
    });

    const logModel = api.addModel("LogModel", {
      contentType: "application/json",
      modelName: "LogModel",
      schema: LogSchema as apigateway.JsonSchema,
    });

    const registerDeviceTokenModel = api.addModel("RegisterDeviceTokenModel", {
      contentType: "application/json",
      modelName: "RegisterDeviceTokenModel",
      schema: RegisterDeviceTokenSchema as apigateway.JsonSchema,
    });

    const createAccountModel = api.addModel("CreateAccountModel", {
      contentType: "application/json",
      modelName: "CreateAccountModel",
      schema: CreateAccountSchema as apigateway.JsonSchema,
    });

    const updateAccountModel = api.addModel("UpdateAccountModel", {
      contentType: "application/json",
      modelName: "UpdateAccountModel",
      schema: UpdateAccountSchema as apigateway.JsonSchema,
    });

    const deviceTokenModel = api.addModel("DeviceTokenModel", {
      contentType: "application/json",
      modelName: "DeviceTokenModel",
      schema: DeviceTokenSchema as apigateway.JsonSchema,
    });

    const reactionModel = api.addModel("ReactionModel", {
      contentType: "application/json",
      modelName: "ReactionModel",
      schema: ReactionSchema as apigateway.JsonSchema,
    });

    const replyModel = api.addModel("ReplyModel", {
      contentType: "application/json",
      modelName: "ReplyModel",
      schema: ReplySchema as apigateway.JsonSchema,
    });

    const auth = (required: boolean): apigateway.MethodOptions =>
      required && cognitoAuthorizer
        ? {
            authorizationType: apigateway.AuthorizationType.COGNITO,
            authorizer: cognitoAuthorizer,
          }
        : { authorizationType: apigateway.AuthorizationType.NONE };

    // -----------------------------------------------------------
    // API Methods
    // -----------------------------------------------------------

    // GET /available-versions
    api.root
      .addResource("available-versions")
      .addMethod(
        "GET",
        new apigateway.LambdaIntegration(getAvailableVersions),
        {
          authorizationType: apigateway.AuthorizationType.NONE,
        },
      );

    // GET /{version}
    api.root
      .addResource("{version}")
      .addMethod("GET", new apigateway.LambdaIntegration(getProverb), {
        authorizationType: apigateway.AuthorizationType.NONE,
        requestParameters: {
          "method.request.querystring.date": false,
        },
        requestValidator,
      });

    // GET /get-proverbs
    api.root
      .addResource("get-proverbs")
      .addMethod("GET", new apigateway.LambdaIntegration(getProverbs), {
        authorizationType: apigateway.AuthorizationType.NONE,
        requestParameters: {
          "method.request.querystring.limit": false,
          "method.request.querystring.lastKey": false,
          "method.request.querystring.scanForward": false,
          "method.request.querystring.month": false,
        },
        requestValidator,
      });

    // Accounts
    const accounts = api.root.addResource("accounts");
    const accountUuid = accounts.addResource("{uuid}");
    accountUuid.addMethod(
      "GET",
      new apigateway.LambdaIntegration(accountHandler),
      {
        ...auth(true),
        requestParameters: {
          "method.request.path.uuid": true,
        },
        requestValidator,
      },
    );
    accountUuid.addMethod(
      "DELETE",
      new apigateway.LambdaIntegration(accountHandler),
      {
        ...auth(true),
        requestParameters: {
          "method.request.path.uuid": true,
        },
        requestValidator,
      },
    );
    accountUuid
      .addResource("create")
      .addMethod("POST", new apigateway.LambdaIntegration(accountHandler), {
        ...auth(true),
        requestParameters: {
          "method.request.path.uuid": true,
        },
        requestModels: {
          "application/json": createAccountModel,
        },
        requestValidator: bodyValidator,
      });

    accountUuid
      .addResource("meditations")
      .addResource("{date}")
      .addMethod("POST", new apigateway.LambdaIntegration(accountHandler), {
        ...auth(true),
        requestParameters: {
          "method.request.path.uuid": true,
          "method.request.path.date": true,
        },
        requestValidator,
      });

    accountUuid.addMethod(
      "PUT",
      new apigateway.LambdaIntegration(accountHandler),
      {
        ...auth(true),
        requestParameters: {
          "method.request.path.uuid": true,
        },
        requestModels: {
          "application/json": updateAccountModel,
        },
        requestValidator: bodyValidator,
      },
    );

    accountUuid
      .addResource("device-tokens")
      .addMethod("PUT", new apigateway.LambdaIntegration(accountHandler), {
        ...auth(true),
        requestParameters: {
          "method.request.path.uuid": true,
        },
        requestModels: {
          "application/json": deviceTokenModel,
        },
        requestValidator: bodyValidator,
      });

    // Notes
    const notes = api.root.addResource("notes");

    const proverbs = notes.addResource("proverbs");
    const proverbsRef = proverbs.addResource("{ref}");
    proverbsRef.addMethod(
      "GET",
      new apigateway.LambdaIntegration(noteHandler),
      {
        ...auth(true),
        requestParameters: {
          "method.request.path.ref": true,
          "method.request.querystring.limit": false,
          "method.request.querystring.lastKey": false,
          "method.request.querystring.scanForward": false,
          "method.request.querystring.userId": false,
        },
        requestValidator,
      },
    );

    const users = notes.addResource("users");
    const usersUuid = users.addResource("{uuid}");
    usersUuid.addMethod("GET", new apigateway.LambdaIntegration(noteHandler), {
      ...auth(true),
      requestParameters: {
        "method.request.path.uuid": true,
        "method.request.querystring.limit": false,
        "method.request.querystring.lastKey": false,
        "method.request.querystring.scanForward": false,
      },
      requestValidator,
    });

    const usersUuidRef = usersUuid.addResource("{ref}");
    usersUuidRef.addMethod(
      "GET",
      new apigateway.LambdaIntegration(noteHandler),
      {
        ...auth(true),
        requestParameters: {
          "method.request.path.uuid": true,
          "method.request.path.ref": true,
        },
        requestValidator,
      },
    );

    usersUuidRef.addMethod(
      "POST",
      new apigateway.LambdaIntegration(noteHandler),
      {
        ...auth(true),
        requestParameters: {
          "method.request.path.uuid": true,
          "method.request.path.ref": true,
        },
        requestModels: {
          "application/json": noteModel,
        },
        requestValidator: bodyValidator,
      },
    );
    usersUuidRef.addMethod(
      "DELETE",
      new apigateway.LambdaIntegration(noteHandler),
      {
        ...auth(true),
        requestParameters: {
          "method.request.path.uuid": true,
          "method.request.path.ref": true,
        },
        requestValidator,
      },
    );

    // Reactions
    const reactionsResource = usersUuidRef.addResource("reactions");
    reactionsResource.addMethod(
      "PUT",
      new apigateway.LambdaIntegration(noteHandler),
      {
        ...auth(true),
        requestParameters: {
          "method.request.path.uuid": true,
          "method.request.path.ref": true,
        },
        requestModels: {
          "application/json": reactionModel,
        },
        requestValidator: bodyValidator,
      },
    );
    reactionsResource.addMethod(
      "DELETE",
      new apigateway.LambdaIntegration(noteHandler),
      {
        ...auth(true),
        requestParameters: {
          "method.request.path.uuid": true,
          "method.request.path.ref": true,
          "method.request.querystring.date": true,
        },
        requestValidator,
      },
    );
    reactionsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(noteHandler),
      {
        ...auth(true),
        requestParameters: {
          "method.request.path.uuid": true,
          "method.request.path.ref": true,
          "method.request.querystring.date": true,
          "method.request.querystring.userId": false,
        },
        requestValidator,
      },
    );

    // Replies
    const repliesResource = usersUuidRef.addResource("replies");
    repliesResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(noteHandler),
      {
        ...auth(true),
        requestParameters: {
          "method.request.path.uuid": true,
          "method.request.path.ref": true,
        },
        requestModels: {
          "application/json": replyModel,
        },
        requestValidator: bodyValidator,
      },
    );
    repliesResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(noteHandler),
      {
        ...auth(true),
        requestParameters: {
          "method.request.path.uuid": true,
          "method.request.path.ref": true,
          "method.request.querystring.date": true,
          "method.request.querystring.limit": false,
          "method.request.querystring.lastKey": false,
        },
        requestValidator,
      },
    );

    repliesResource.addMethod(
      "DELETE",
      new apigateway.LambdaIntegration(noteHandler),
      {
        ...auth(true),
        requestParameters: {
          "method.request.path.uuid": true,
          "method.request.path.ref": true,
          "method.request.querystring.date": true,
          "method.request.querystring.replySk": true,
        },
        requestValidator,
      },
    );

    // POST /logs
    const logsResource = api.root.addResource("logs");
    logsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(logHandler),
      {
        authorizationType: apigateway.AuthorizationType.NONE,
        requestModels: {
          "application/json": logModel,
        },
        requestValidator: bodyValidator,
      },
    );

    // POST /auth/check-user-exists
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

    const apiKey = api.addApiKey("CheckUserExistsKey", {
      apiKeyName: "check-user-exists-key",
    });

    const usagePlan = api.addUsagePlan("CheckUserExistsUsagePlan", {
      name: "check-user-exists-rate-limit",
      description: "Rate limiting for check-user-exists endpoint",
      throttle: {
        rateLimit: 10,
        burstLimit: 20,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.DAY,
      },
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: api.deploymentStage,
    });

    // POST /push/register-token
    api.root
      .addResource("push")
      .addResource("register-token")
      .addMethod(
        "POST",
        new apigateway.LambdaIntegration(registerDeviceToken),
        {
          authorizationType: apigateway.AuthorizationType.NONE,
          requestModels: {
            "application/json": registerDeviceTokenModel,
          },
          requestValidator: bodyValidator,
        },
      );

    // GET /widgets/render — Voltra server-driven widget endpoint
    api.root
      .addResource("widgets")
      .addResource("render")
      .addMethod("GET", new apigateway.LambdaIntegration(serverWidgetHandler), {
        authorizationType: apigateway.AuthorizationType.NONE,
        requestParameters: {
          "method.request.querystring.widgetId": true,
          "method.request.querystring.platform": true,
          "method.request.querystring.theme": false,
          "method.request.querystring.family": false,
        },
        requestValidator,
      });

    // -----------------------------------------------------------
    // IAM Grants
    // -----------------------------------------------------------
    table.grantReadWriteData(migrateUserUuids);
    table.grantReadWriteData(chooseProverb);
    table.grantReadWriteData(loadProverbsLambda);
    table.grantReadWriteData(accountHandler);
    table.grantReadWriteData(noteHandler);
    table.grantReadData(getAvailableVersions);
    table.grantReadData(getProverb);
    table.grantReadData(getProverbs);
    table.grantWriteData(registerDeviceToken);
    table.grantReadWriteData(pushDailyProverb);
    table.grantReadWriteData(pushAccountNotifications);
    table.grantReadData(serverWidgetHandler);

    const fcmSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "imported-fcm-secret",
      props.fcmSecretName,
    );
    fcmSecret.grantRead(pushDailyProverb);
    fcmSecret.grantRead(pushAccountNotifications);
    fcmSecret.grantRead(noteHandler);

    // -----------------------------------------------------------
    // EventBridge Rules & Event Source Mappings
    // -----------------------------------------------------------
    new events.Rule(this, "lemuel-schedule", {
      ruleName: "lemuel-schedule",
      schedule: events.Schedule.cron({ minute: "0", hour: "6" }),
      targets: [new targets.LambdaFunction(chooseProverb)],
    });

    pushDailyProverb.addEventSource(
      new eventSources.DynamoEventSource(table, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        filters: [
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual("INSERT"),
          }),
        ],
      }),
    );

    pushAccountNotifications.addEventSource(
      new eventSources.DynamoEventSource(table, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        retryAttempts: 2,
        bisectBatchOnError: true,
        filters: [
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual("INSERT"),
          }),
        ],
      }),
    );
  }
}
