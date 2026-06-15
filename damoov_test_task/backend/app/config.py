from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    groq_api_key: str = ''
    groq_base_url: str = 'https://api.groq.com/openai/v1'
    groq_model: str = 'llama-3.3-70b-versatile'
    groq_temperature: float = 0.2
    telematics_base_url: str = 'https://user.telematicssdk.com'


settings = Settings()
