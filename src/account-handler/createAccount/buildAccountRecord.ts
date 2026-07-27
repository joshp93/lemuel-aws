export const buildAccountRecord = (uuid: string, displayName: string) => ({
  pk: uuid,
  sk: "account",
  accountCreatedDate: new Date().toISOString(),
  totalMeditations: 0,
  totalNotes: 0,
  displayName,
});
