# Telematics Agent

An Angular chat app over a FastAPI backend that searches and manages telematics
users through the Management API. The agent streams its replies, runs read tools
immediately, and never performs a mutating action without an explicit confirmation
in the UI. The original user-list widget still lives at `/users`.

## Run

Backend (needs an OpenAI key):

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set OPENAI_API_KEY
uvicorn app.main:app --port 8000
```

Frontend:

```bash
npm install
npm run dev            # http://localhost:4200
```

The dev server proxies `/ws` and `/api` to the backend and `/v1` to the telematics
API (see `proxy.conf.json`). Open the app, paste a JWT access token and an
ApplicationId on the setup screen, then chat.

## Get a test token

```bash
curl --request POST \
  --url 'https://user.telematicssdk.com/v1/Auth/Login' \
  --header 'content-type: application/json' \
  --data '{"LoginFields":"{\"email\":\"\"}","Password":""}'
```

The token is at `Result.AccessToken.Token`.

## Tests

```bash
npm test                              # frontend
cd backend && pip install -r requirements-dev.txt && pytest   # backend
```
