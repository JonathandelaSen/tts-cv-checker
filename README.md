<div align="center">

# 🚀 ATS CV AI Checker

**AI-driven analysis, optimization, and elevation of your CV.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Local_Ready-green?logo=supabase)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini-blue?logo=google)](https://ai.google.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind_4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

</div>

<br/>

## ✨ Key Features

It's not just a parser; it's a complete toolkit for your resume:

- 🎯 **Targeted Job Matching:** Paste a job description and get an ATS-style match rate and targeted recommendations.
- 📊 **General Profile Review:** Receive a comprehensive evaluation and a custom questionnaire to improve your CV.
- 🎨 **AI-Powered Templates:** Choose from professional designs and let the AI automatically structure and fill them with your CV data.
- ✍️ **Intelligent CV Editor:** Refine your resume with natural language instructions. Shorten sections, improve clarity, or change the tone instantly with AI.
- 📚 **Smart CV Library:** Upload, preview (PDF support), and manage multiple versions of your resume seamlessly.

---

## 🛠️ Quick Start (Local Setup)

Get the project running on your local machine in just a few minutes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [Docker](https://www.docker.com/) (required for local Supabase and the Python parser)

### 1. Clone the repository

```bash
git clone https://github.com/JonathandelaSen/ats-cv-ai-checker.git
cd ats-cv-ai-checker
npm install
```

### 2. Start the Database

We use [Supabase](https://supabase.com/) for authentication, database, and storage. You can run it entirely locally:

```bash
npm run supabase:start
```

_(Keep the terminal open to copy the API keys generated in the output!)_

### 3. Environment Setup

```bash
cp .env.example .env.local
```

Fill in the variables in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` & `SUPABASE_SERVICE_ROLE_KEY`: From the local Supabase start output.
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `PYTHON_PARSER_URL`: `http://127.0.0.1:8001` for local development.
- `PYTHON_PARSER_SECRET`: Shared secret used by the Next.js app to call the Python parser.

### 4. Start the Python Parser

The Python parser runs as a small local service and mirrors the production parser.

```bash
cp services/pdf-parser/.env.example services/pdf-parser/.env.local
```

Set `SUPABASE_SERVICE_ROLE_KEY` in `services/pdf-parser/.env.local` from the local Supabase output, then run:

```bash
npm run parser:dev
```

### 5. Run the App

```bash
npm run dev
```

🎉 **Open [http://localhost:3000](http://localhost:3000) and start uploading your CVs!**

---

## 🧱 Tech Stack

A modern, robust, and scalable foundation:

- **Frontend:** Next.js 16 (App Router), React 19, TailwindCSS 4, Framer Motion
- **Backend & DB:** Supabase (Auth, Postgres DB, Edge Storage)
- **AI Integrations:** Google GenAI (Gemini)
- **File Processing:** `pdf-parse`, `pdfjs-dist`, Python `pdfminer.six`

## Python Parser Deployment

Deploy the parser as a separate Vercel project named `ats-cv-python-parser`:

```bash
cd services/pdf-parser
vercel link
vercel env add PYTHON_PARSER_SECRET production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel --prod
```

Add these variables to the main Next.js Vercel project:

```env
PYTHON_PARSER_URL=https://ats-cv-python-parser.vercel.app
PYTHON_PARSER_SECRET=the-same-secret
```

<br/>

<div align="center">
  <i>Empower your job search with AI.</i>
</div>
