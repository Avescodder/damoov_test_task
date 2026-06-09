# User List Widget

A small Angular SPA that lists users from the Telematics SDK Management API. It
is designed to be embedded in an iframe: the host page supplies the JWT through
the URL, and the widget's height is driven entirely by its content.

## Run

> Requires Node `>= 22.22.3` (Angular 22).

```bash
npm install
npm run dev
```

`npm run dev` starts the Angular dev server on http://localhost:4200 and proxies
`/v1` to `https://user.telematicssdk.com` (see `proxy.conf.json`), so the browser
talks to the same origin and there are no CORS issues during development. Open:

```
http://localhost:4200/?access_token=<jwt>
```

Other scripts:

```bash
npm run build   # production bundle in dist/
npm test        # unit tests (Vitest)
```

## Auth

The widget reads the JWT from the URL query string:

```js
new URLSearchParams(window.location.search).get('access_token');
```

and sends it as `Authorization: Bearer <token>` on every API call. If no token is
present it renders an error state:

> No access token. Pass `?access_token=<jwt>` in the URL.

## Embed via iframe

```html
<iframe src="http://your-host/users?access_token=<jwt>" width="100%" style="border:none;"></iframe>
```

The widget flows to its content height, works down to a 320px width, and below
640px the Device, IMEI and Application columns are hidden to fit narrow frames.

## Get a test token

```bash
curl --request POST \
  --url 'https://user.telematicssdk.com/v1/Auth/Login' \
  --header 'content-type: application/json' \
  --data '{"LoginFields":"{\"email\":\"YOUR_EMAIL\"}","Password":"YOUR_PASSWORD"}'
```

The token is at `Result.AccessToken.Token`.

## API

The widget posts to:

```
POST https://user.telematicssdk.com/v1/Management/users/GetFilteredPage
```

with the body (page number/size change with pagination):

```json
{
  "ApplicationIds": ["4603BEAE-E28A-4E6C-8FF9-3CA6DF360FD3"],
  "PageNumber": 1,
  "PageSize": 20,
  "IncludeAccountInfo": true
}
```

## Project layout

```
src/app/
  core/
    config.ts             API_BASE_URL + APPLICATION_ID
    api-response.ts        { Result, Status, Errors } envelope helpers
    request-error.ts       maps failures to user-facing messages
    url.ts                 reads the token from the URL query string
    auth/
      access-token.ts      AccessTokenStore (reads the JWT from the URL)
      auth-interceptor.ts  attaches the Bearer header to API calls
  features/users/
    user.model.ts          API + view-model types
    users-mapper.ts        builds the request body, normalizes the response
    users-service.ts       GetFilteredPage call
    users-page/            smart component: signals, paging, states
    users-table/           presentational table (8 columns)
```

## Notes

- The component uses Angular signals (`signal`, `computed`) for all state:
  `users`, `loading`, `error`, `pageNumber`, `pageSize`, `totalUsers`,
  `totalPages`, `hasNext`, `hasPrev`.
- The API origin is an injection token, `API_BASE_URL` (`src/app/core/config.ts`),
  empty by default so requests are same-origin. In production either serve the
  SPA behind a gateway that proxies `/v1`, or set `API_BASE_URL` to
  `https://user.telematicssdk.com`.
