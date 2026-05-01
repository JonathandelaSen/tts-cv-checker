<div align="center">

# 🚀 TTS CV AI Checker

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
- 📚 **Smart CV Library:** Upload, preview (PDF support), and manage multiple versions of your resume seamlessly.

---

## 🛠️ Quick Start (Local Setup)

Get the project running on your local machine in just a few minutes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [Docker](https://www.docker.com/) (Required for local Supabase)

### 1. Clone the repository

```bash
git clone https://github.com/JonathandelaSen/tts-cv-ai-checker.git
cd tts-cv-ai-checker
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

### 4. Run the App

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
- **File Processing:** `pdf-parse`, `pdfjs-dist`

<br/>

<div align="center">
  <i>Empower your job search with AI.</i>
</div>
