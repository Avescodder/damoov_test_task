import { HttpErrorResponse } from '@angular/common/http';
import { describeRequestError } from './request-error';

describe('describeRequestError', () => {
  it('explains an expired or invalid token on 401/403', () => {
    const message = describeRequestError(new HttpErrorResponse({ status: 401 }));
    expect(message).toContain('invalid or has expired');
  });

  it('reports a connectivity problem on status 0', () => {
    expect(describeRequestError(new HttpErrorResponse({ status: 0 }))).toContain(
      'Could not reach the API',
    );
  });

  it('surfaces the API error message from the envelope body', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        Result: null,
        Status: 400,
        Title: 'Bad request',
        Errors: [{ Message: 'Invalid filter' }],
      },
    });
    expect(describeRequestError(error)).toBe('Invalid filter');
  });

  it('passes through plain Error messages', () => {
    expect(describeRequestError(new Error('boom'))).toBe('boom');
  });

  it('falls back to a generic message for unknown values', () => {
    expect(describeRequestError('weird')).toBe('Something went wrong while loading users.');
  });
});
