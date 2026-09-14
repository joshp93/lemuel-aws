process.env.COGNITO_CLIENT_ID = "test-client-id";
process.env.COGNITO_USER_POOL_ID = "test-pool-id";
process.env.TABLE_NAME = "test-table";

jest.mock("@aws-lambda-powertools/logger");
