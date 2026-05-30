#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { LemuelSecretStack } from "../lib/lemuel-secret-stack";
import { LemuelStack } from "../lib/lemuel-stack";
import { LemuelUserManagementStack } from "../lib/lemuel-user-management-stack";

const app = new cdk.App();

const env = { account: "640223110844", region: "eu-west-2" };

const secretStack = new LemuelSecretStack(app, "LemuelSecretStack", { env });
const userManagementStack = new LemuelUserManagementStack(
  app,
  "LemuelUserManagementStack",
  { env },
);
new LemuelStack(app, "LemuelStack", {
  env,
  userPool: userManagementStack.userPool,
  apiBibleSecretName: secretStack.apiBibleSecretName,
});
