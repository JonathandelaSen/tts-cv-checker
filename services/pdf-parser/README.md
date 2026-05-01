# ATS CV Python Parser

Python PDF parser service for `tts-cv-ai-checker`. It exposes `POST /extract`,
downloads a PDF from Supabase Storage, parses it with `pdfminer.six`, and returns
`{ "text": "...", "error": null }`.

## Environment

```env
PYTHON_PARSER_SECRET=dev-secret
SUPABASE_URL=http://host.docker.internal:55431
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Local Docker

From the repository root:

```bash
docker compose up pdf-parser
```

The service runs at `http://127.0.0.1:8001`.

## Vercel

Create a separate Vercel project from this directory named
`ats-cv-python-parser`:

```bash
cd services/pdf-parser
vercel link
vercel env add PYTHON_PARSER_SECRET production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel --prod
```
