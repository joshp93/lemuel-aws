/**
 * Sleeps for the given number of milliseconds.
 * @param ms - Number of milliseconds to sleep
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculates the delay before the next retry attempt using exponential backoff
 * with random jitter to avoid thundering herd problems.
 * @param attempt - The zero-based retry attempt number
 * @param baseDelayMs - Base delay in milliseconds
 * @returns Delay in milliseconds
 */
const calculateDelay = (attempt: number, baseDelayMs: number): number => {
  const delay = baseDelayMs * 2 ** attempt;
  const jitter = Math.random() * delay * 0.5;
  return Math.floor(delay + jitter);
};

/**
 * Wraps the native fetch API with retry logic using exponential backoff.
 * Retries on 5xx server errors and network errors. Does NOT retry on 4xx
 * client errors (e.g. 404, 403) as those indicate a non-transient issue.
 *
 * Default behaviour:
 * - Up to 3 total attempts (initial + 2 retries)
 * - Base delay of 500ms, doubled each retry, with random jitter
 * - 5xx responses and network errors are retried; 4xx responses are returned immediately
 *
 * @param url - The URL to fetch
 * @param options - Fetch request options (headers, method, body, etc.)
 * @param maxRetries - Maximum number of retry attempts (default 2, giving 3 total tries)
 * @param baseDelayMs - Base delay in milliseconds for exponential backoff (default 500)
 * @returns The Response object from the final fetch attempt
 * @throws The last error encountered if all retries are exhausted
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
  baseDelayMs = 500,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response | undefined;

    try {
      response = await fetch(url, options);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const delay = calculateDelay(attempt, baseDelayMs);
      console.log(
        `Network error on attempt ${attempt + 1}/${maxRetries + 1}: ${errorMessage}, retrying in ${delay}ms...`,
      );
      await sleep(delay);
      continue;
    }

    if (response.ok) {
      return response;
    }

    if (response.status >= 400 && response.status < 500) {
      return response;
    }

    if (attempt === maxRetries) {
      return response;
    }

    const delay = calculateDelay(attempt, baseDelayMs);
    console.log(
      `Received ${response.status} on attempt ${attempt + 1}/${maxRetries + 1}, retrying in ${delay}ms...`,
    );
    await sleep(delay);
  }

  throw new Error("Unreachable");
}
