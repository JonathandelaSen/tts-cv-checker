import { GoogleGenAI } from "@google/genai";
import {
  CV_PROFILE_SCHEMA_VERSION,
  normalizeStandardCVProfile,
  type StandardCVProfile,
} from "@/lib/cv-profile";

export interface AIStructuredProfileResult {
  schemaVersion: typeof CV_PROFILE_SCHEMA_VERSION;
  profile: StandardCVProfile;
}

const SYSTEM_PROMPT = `You are a precise CV data extraction engine.

Extract the user's CV into the standard JSON schema below.

Critical rules:
- Do not invent any facts, dates, employers, education, skills, links, or achievements.
- Do not rewrite, optimize, embellish, or translate the user's professional content.
- Preserve the original language and wording from the CV as much as possible.
- If a field is missing, use null, an empty string, or an empty array as appropriate.
- Keep bullets faithful to the source text; only split obvious list items.
- Respond ONLY with valid JSON.

JSON format:
{
  "basics": {
    "name": "string",
    "headline": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "links": [{ "label": "string", "url": "string" }]
  },
  "summary": "string",
  "experience": [
    {
      "company": "string",
      "role": "string",
      "location": "string",
      "dates": { "start": "string", "end": "string", "current": false },
      "bullets": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "location": "string",
      "dates": { "start": "string", "end": "string", "current": false },
      "details": ["string"]
    }
  ],
  "skills": [{ "name": "string", "items": ["string"] }],
  "languages": [{ "name": "string", "level": "string" }],
  "certifications": [{ "name": "string", "issuer": "string", "date": "string", "url": "string", "description": "string", "bullets": ["string"] }],
  "projects": [{ "name": "string", "organization": "string", "date": "string", "url": "string", "description": "string", "bullets": ["string"] }],
  "awards": [{ "name": "string", "issuer": "string", "date": "string", "description": "string", "bullets": ["string"] }],
  "publications": [{ "name": "string", "organization": "string", "date": "string", "url": "string", "description": "string", "bullets": ["string"] }],
  "volunteering": [{ "name": "string", "organization": "string", "date": "string", "description": "string", "bullets": ["string"] }]
}`;

export async function structureCVProfileWithAI(input: {
  apiKey: string;
  model: string;
  text: string;
}): Promise<AIStructuredProfileResult> {
  const googleAI = new GoogleGenAI({ apiKey: input.apiKey });
  const response = await googleAI.models.generateContent({
    model: input.model,
    contents: [{ role: "user", parts: [{ text: input.text }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
    },
  });

  const rawText = response.text || "{}";
  const parsed = JSON.parse(rawText) as unknown;

  return {
    schemaVersion: CV_PROFILE_SCHEMA_VERSION,
    profile: normalizeStandardCVProfile(parsed),
  };
}
