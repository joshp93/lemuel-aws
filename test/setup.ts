process.env.COGNITO_CLIENT_ID = "test-client-id";
process.env.COGNITO_USER_POOL_ID = "test-pool-id";
process.env.TABLE_NAME = "test-table";

global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
