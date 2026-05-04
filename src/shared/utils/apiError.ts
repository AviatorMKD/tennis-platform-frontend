import axios from 'axios';

export function extractApiErrorMessage(
  error: unknown,
  fallbackMessage = 'Something went wrong.',
): string {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return fallbackMessage;
  }

  const responseData = error.response?.data;

  // ✅ PRIORITY 1: explicit backend message
  if (
    responseData &&
    typeof responseData === 'object' &&
    'message' in responseData &&
    typeof responseData.message === 'string' &&
    responseData.message.trim()
  ) {
    return responseData.message.trim();
  }

  // ✅ PRIORITY 2: plain string response
  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData.trim();
  }

  const status = error.response?.status;

  // ✅ Specific fallback cases AFTER trying backend message
  if (status === 401) {
    return 'Invalid email or password.';
  }

  if (status === 403) {
    return 'Access forbidden.';
  }

  if (!error.response) {
    return 'Could not reach the server. Check your connection and try again.';
  }

  // Validation errors
  if (
    responseData &&
    typeof responseData === 'object' &&
    'title' in responseData &&
    typeof responseData.title === 'string' &&
    responseData.title.trim()
  ) {
    const title = responseData.title.trim();

    if (
      'errors' in responseData &&
      responseData.errors &&
      typeof responseData.errors === 'object'
    ) {
      const validationMessages = Object.values(
        responseData.errors as Record<string, string[]>,
      )
        .flat()
        .filter((message) => typeof message === 'string' && message.trim());

      if (validationMessages.length > 0) {
        return validationMessages.join(' ');
      }
    }

    return title;
  }

  return fallbackMessage;
}