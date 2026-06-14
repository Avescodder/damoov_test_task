from fastapi import FastAPI

from app.ws import router as ws_router

app = FastAPI(title='Telematics Agent')
app.include_router(ws_router)


@app.get('/api/health')
async def health() -> dict[str, str]:
    return {'status': 'ok'}
