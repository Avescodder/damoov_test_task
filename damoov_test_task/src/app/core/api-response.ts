export interface ApiError {
  Code?: string | number;
  Message?: string;
}

/** Every user.telematicssdk.com endpoint wraps its payload in this envelope. */
export interface ApiResponse<T> {
  Result: T;
  Status: number;
  Title: string;
  Errors: ApiError[];
}

export function isSuccessful(response: ApiResponse<unknown>): boolean {
  const hasErrors = (response.Errors?.length ?? 0) > 0;
  return response.Status >= 200 && response.Status < 300 && !hasErrors;
}

export function firstErrorMessage(response: ApiResponse<unknown>): string | undefined {
  const withMessage = response.Errors?.find((error) => error?.Message);
  return withMessage?.Message ?? (response.Title || undefined);
}

export function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return typeof value === 'object' && value !== null && 'Status' in value && 'Errors' in value;
}
