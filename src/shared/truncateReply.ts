/** Truncates reply content to a maximum length for use in push notification previews.
 *  Appends "..." when the content exceeds the limit. */
export const truncateReply = (content: string, maxLen = 90): string => {
  if (content.length <= maxLen) return content;
  return `${content.slice(0, maxLen)}...`;
};
