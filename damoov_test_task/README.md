# Telematics Agent
 
A chat-based assistant for managing the users registered to a Damoov Telematics
application. You talk to it in plain language ("list users", "disable user
f925d077…", "update SDK settings"), and it calls the Telematics API on your
behalf. Any action that changes or deletes data is held back until you confirm it.
 
The project has two parts:
 
- **`/` (frontend)** — an Angular 22 single-page app. A chat view on the right, a
  live users panel on the left that updates as the agent works. There is also a
  standalone paginated users page at `/users`.
- **`/backend`** — a FastAPI service. It holds the WebSocket connection, runs the
  LLM agent loop (via Groq's OpenAI-compatible API), and talks to the Telematics
  API. Write actions pause for confirmation before they run.

## Requirements
 
- Node.js (per Angular 22: Node ^22.22.3 or ^24.15.0) and npm
- Python 3.11+
- A Groq API key
- A Telematics access token (JWT) for the application you want to manage

## Backend setup
 
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
 
cp .env.example .env   # then fill in GROQ_API_KEY
python -m uvicorn app.main:app --reload --port 8000
```

## Frontend setup
 
```bash
npm install
npm start          # serves on http://localhost:4200
```

The dev server proxies `/ws` and `/api` to the backend on port 8000, and proxies
`/v1` straight to the Telematics API (see `proxy.conf.json`).
 
Open `http://localhost:4200`, paste your access token and application ID into the
setup form, and start chatting. The app can also pick the token up from the URL
(`?access_token=<jwt>` or `#access_token=<jwt>`), which is how it's meant to run
when embedded as an iframe widget.

## Notes
 
- The application ID defaults to the one in `src/app/core/config.ts`; override it
  in the setup form for a different app.
- The access token is read from the URL hash first (it never reaches the server
  in a Referer header or access log), then the query string.


