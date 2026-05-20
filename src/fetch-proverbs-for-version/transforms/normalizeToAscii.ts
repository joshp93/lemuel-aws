export const normalizeToAscii = (str: string): string => {
  const replacements: [RegExp, string][] = [
    [/[\u2018\u2019]/g, "'"],
    [/[\u201C\u201D]/g, '"'],
    [/[\u2013]/g, "-"],
    [/[\u2014]/g, "-"],
    [/\u2026/g, "..."],
    [/\u00A0/g, " "],
    [/\u00A9/g, "(C)"],
    [/\u00AE/g, "(R)"],
    [/[\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5]/g, "A"],
    [/[\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5]/g, "a"],
    [/[\u00C8\u00C9\u00CA\u00CB]/g, "E"],
    [/[\u00E8\u00E9\u00EA\u00EB]/g, "e"],
    [/[\u00CC\u00CD\u00CE\u00CF]/g, "I"],
    [/[\u00EC\u00ED\u00EE\u00EF]/g, "i"],
    [/[\u00D0]/g, "D"],
    [/[\u00F0]/g, "d"],
    [/[\u00D1]/g, "N"],
    [/[\u00F1]/g, "n"],
    [/[\u00D2\u00D3\u00D4\u00D5\u00D6\u00D8]/g, "O"],
    [/[\u00F2\u00F3\u00F4\u00F5\u00F6\u00F8]/g, "o"],
    [/[\u00D9\u00DA\u00DB\u00DC]/g, "U"],
    [/[\u00F9\u00FA\u00FB\u00FC]/g, "u"],
    [/[\u00DD\u00FD]/g, "Y"],
    [/[\u00FF\u00FE]/g, "y"],
    [/[\u00C7]/g, "C"],
    [/[\u00E7]/g, "c"],
    [/[^\x00-\x7F]/g, ""],
  ];

  let result = str;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  result = result
    .replace("A(C)", "(C)")
    .replace("A(R)", "(R)")
    .replace(/[ ]+/g, " ");
  return result;
};
