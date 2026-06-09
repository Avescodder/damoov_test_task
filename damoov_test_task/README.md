# Users SPA


## How it works

1. On start, the app reads the access token from the URL (see below).
2. An HTTP interceptor attaches it as `Authorization: Bearer <token>` to API calls.
3. `UsersService` posts to `/v1/Management/users/GetFilteredPage` and the response
   is normalized into display-ready rows.

### Passing the token

The token is read from the URL, hash first (preferred — it is never sent to the
server or logged), then the query string:

```
https://your-host/#access_token=YOUR_JWT
https://your-host/?access_token=YOUR_JWT      # also supported
https://your-host/?token=YOUR_JWT             # alias
```

If no token is present the app renders a clear "No access token" message instead
of calling the API.

### Company scope

`GetFilteredPage` requires a non-empty `CompanyIds`. The app reads it from a
`company_ids` URL parameter, falling back to the token claims when present.
Damoov's access tokens (Auth0) do not carry a company id, so pass it explicitly:

```
https://your-host/?access_token=YOUR_JWT&company_ids=GUID1,GUID2
```

Find the GUID in the Damoov dashboard, or copy it from the `GetFilteredPage`
request payload on the dashboard's Users page (DevTools → Network).

### Embedding

```html
<iframe
  src="https://your-host/#access_token=YOUR_JWT"
  style="width:100%;height:600px;border:0"
></iframe>
```

## Getting a test token

The API is not called to log in (the host supplies the token), but you can mint
one for local testing with your own Damoov credentials:

```bash
curl --request POST \
  --url 'https://user.telematicssdk.com/v1/Auth/Login' \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --data '{"LoginFields":"{\"email\":\"YOUR_EMAIL\"}","Password":"YOUR_PASSWORD"}'
```

Copy `Result.AccessToken.Token` from the response and put it in the URL. Never
commit real credentials — pass them only at request time.

## Run it

Requires Node `>= 22.22.3` (Angular 22).

```bash
npm install
npm start          # http://localhost:4200/?access_token=YOUR_JWT
```

`npm start` proxies `/v1` to `https://user.telematicssdk.com` (see
`proxy.conf.json`), so the browser talks to the same origin and there are no CORS
issues during development.

```bash
npm test           # unit tests (Vitest)
npm run build      # production bundle in dist/
```

## Configuration

The API origin is an injection token, `API_BASE_URL` (`src/app/core/config.ts`),
empty by default so requests are same-origin:

- **Local dev** — the dev-server proxy forwards `/v1` to the API.
- **Production / iframe** — either serve the SPA behind a gateway that proxies
  `/v1` to the API, or set `API_BASE_URL` to `https://user.telematicssdk.com`
  (the API allows cross-origin calls from the browser).

## Project layout

```
src/app/
  core/
    config.ts            API_BASE_URL token
    api-response.ts      { Result, Status, Title, Errors } envelope helpers
    request-error.ts     maps failures to user-facing messages
    url.ts               reads query/hash params (hash first)
    auth/
      access-token.ts    reads the JWT from the URL + AccessTokenStore
      jwt.ts             decodes claims, extracts the company scope
      company-context.ts resolves CompanyIds from the URL or the token
      auth-interceptor.ts attaches the Bearer header to API calls
  features/users/
    user.model.ts        API + view-model types
    users-mapper.ts      builds the request body, normalizes the response
    users-service.ts     GetFilteredPage call
    users-page/          smart component: search, paging, loading/error states
    users-table/         presentational table
```
## Notes on the API contract

Requests and responses follow the `GetFilteredPage` Swagger schema: the envelope
is `{ Result, Status, Title, Errors }`, the page is
`{ Users, TotalUsers, CurrentPage, TotalPages, HasPreviousPage, HasNextPage }`,
and each user nests its display fields under `UserProfile` and its scope under
`AccountInfo`. Mapping to the flat row view model is isolated in
`users-mapper.ts`.

The auth scheme is `Authorization: Bearer <jwt>`; if the API expects a different
header it is a one-line change in `auth-interceptor.ts`.
