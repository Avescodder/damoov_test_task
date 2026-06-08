import { HttpErrorResponse } from '@angular/common/http';
import { firstErrorMessage, isApiResponse } from './api-response';

/** Turns whatever a failed request produced into a single user-facing sentence. */
export function describeRequestError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401 || error.status === 403) {
      return 'Your access token is invalid or has expired.';
    }
    if (error.status === 0) {
      return 'Could not reach the API. Check the connection and try again.';
    }
    if (isApiResponse(error.error)) {
      return firstErrorMessage(error.error) ?? `Request failed with status ${error.status}.`;
    }
    return `Request failed with status ${error.status}.`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Something went wrong while loading users.';
}
