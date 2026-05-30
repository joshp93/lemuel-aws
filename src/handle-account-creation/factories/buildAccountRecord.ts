export const buildAccountRecord = (uuid: string) => ({
  pk: uuid,
  sk: "account",
  accountCreatedDate: new Date().toISOString(),
  totalMeditations: 0,
  totalNotes: 0,
});
