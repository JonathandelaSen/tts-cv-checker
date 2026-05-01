import hmac
import io
import os
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from fastapi import FastAPI, Header, HTTPException
from pdfminer.high_level import extract_text
from pydantic import BaseModel, Field


app = FastAPI(title="ATS CV Python Parser")


class ExtractRequest(BaseModel):
    bucket: str = Field(min_length=1)
    storagePath: str = Field(min_length=1)
    cvId: Optional[str] = None
    requestId: Optional[str] = None


class ExtractResponse(BaseModel):
    text: Optional[str] = None
    error: Optional[str] = None


def require_auth(authorization: Optional[str]) -> None:
    secret = os.environ.get("PYTHON_PARSER_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="Parser secret is not configured.")

    expected = f"Bearer {secret}"
    if not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


def download_pdf(bucket: str, storage_path: str) -> bytes:
    supabase_url = os.environ.get("SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_role_key:
        raise RuntimeError("Supabase storage credentials are not configured.")

    encoded_bucket = quote(bucket, safe="")
    encoded_path = quote(storage_path.lstrip("/"), safe="/")
    url = (
        f"{supabase_url.rstrip('/')}/storage/v1/object/"
        f"{encoded_bucket}/{encoded_path}"
    )
    request = Request(
        url,
        headers={
            "apikey": service_role_key,
            "authorization": f"Bearer {service_role_key}",
        },
        method="GET",
    )

    try:
        with urlopen(request, timeout=20) as response:
            return response.read()
    except HTTPError as error:
        raise RuntimeError(
            f"Supabase storage download failed with HTTP {error.code}."
        ) from error
    except URLError as error:
        raise RuntimeError("Supabase storage download failed.") from error


@app.post("/extract", response_model=ExtractResponse)
def extract_pdf(
    payload: ExtractRequest,
    authorization: Optional[str] = Header(default=None),
) -> ExtractResponse:
    require_auth(authorization)

    try:
        pdf_bytes = download_pdf(payload.bucket, payload.storagePath)
        text = extract_text(io.BytesIO(pdf_bytes))
        return ExtractResponse(text=text or None, error=None)
    except Exception as error:
        return ExtractResponse(text=None, error=str(error))
