import { GoogleGenAI } from "@google/genai";
import type { AIContext, AnalysisMode, JobKeyData } from "@/lib/db";

export interface AIScoreResult {
  score: number;
  feedback: string;
  keywordsFound: string[];
  improvements: string[];
  jobKeywords: string[];
  cvKeywords: string[];
  matchingKeywords: string[];
  missingKeywords: string[];
  jobKeyData: JobKeyData | null;
}

function cleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function cleanJobKeyData(value: unknown): JobKeyData | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  return {
    title: typeof raw.title === "string" ? raw.title : null,
    company: typeof raw.company === "string" ? raw.company : null,
    location: typeof raw.location === "string" ? raw.location : null,
    remote: typeof raw.remote === "string" ? raw.remote : null,
    salary: typeof raw.salary === "string" ? raw.salary : null,
    seniority: typeof raw.seniority === "string" ? raw.seniority : null,
    contractType:
      typeof raw.contractType === "string" ? raw.contractType : null,
    benefits: cleanArray(raw.benefits),
    requirements: cleanArray(raw.requirements),
    responsibilities: cleanArray(raw.responsibilities),
    notablePoints: cleanArray(raw.notablePoints),
  };
}

function buildGeneralPrompt(context: AIContext | null): string {
  const contextLines: string[] = [];

  if (context?.additionalContext) {
    contextLines.push(`- Additional context from the user: ${context.additionalContext}`);
  }

  const contextBlock =
    contextLines.length > 0
      ? `\nThe user provided the following context about their profile:\n${contextLines.join("\n")}\nUse this information to tailor your general evaluation without assuming a specific role.\n`
      : "";

  return `You are a senior CV/Resume consultant and ATS (Applicant Tracking System) expert. Your task is to perform a comprehensive general evaluation of the extracted text from a PDF resume.
${contextBlock}
Evaluate ATS readability, text extraction quality, structure, organization, clarity, quantified impact, relevant skills, length, language consistency, and timeline clarity.

You must respond ONLY with valid JSON using this exact format:
{
  "score": <number from 0 to 100>,
  "feedback": "<Comprehensive summary of strengths and weaknesses. Be specific, actionable, and reply in Spanish.>",
  "keywordsFound": ["<relevant keyword or skill found in the CV>", ...],
  "cvKeywords": ["<relevant keyword or skill found in the CV>", ...],
  "improvements": ["<specific, actionable improvement in Spanish>", ...]
}`;
}

function buildJobMatchPrompt(jobDescription: string, jobUrl?: string | null): string {
  const urlBlock = jobUrl?.trim()
    ? `\nThe source URL provided by the user is: ${jobUrl.trim()}\n`
    : "";

  return `You are a strict ATS recruiter and job-posting analyst. Compare the extracted text from a PDF resume against a specific job posting.

The job description is:
---
${jobDescription}
---
${urlBlock}
Return the comparison and the job-posting summary as structured data. If a field is not present in the job posting, use null or an empty array. Do not invent salary, holidays, company, or benefits.

You must respond ONLY with valid JSON using this exact format:
{
  "score": <number from 0 to 100, where 100 means perfect match>,
  "feedback": "<Detailed analysis in Spanish of how well the resume matches the job posting. Highlight strongest matches and biggest gaps.>",
  "keywordsFound": ["<keyword from job description found in resume>", ...],
  "jobKeywords": ["<important keyword or requirement from the job posting>", ...],
  "cvKeywords": ["<relevant keyword or skill found in the CV>", ...],
  "matchingKeywords": ["<keyword present in both job posting and CV>", ...],
  "missingKeywords": ["<important job keyword missing from the CV>", ...],
  "improvements": ["<specific change to better match this job posting, in Spanish>", ...],
  "jobKeyData": {
    "title": "<job title or null>",
    "company": "<company name or null>",
    "location": "<location or null>",
    "remote": "<remote/hybrid/onsite signal or null>",
    "salary": "<salary/compensation if explicit or null>",
    "seniority": "<seniority if explicit or inferable from requirements, or null>",
    "contractType": "<contract type if explicit or null>",
    "benefits": ["<benefit, vacation, perk, or empty>", ...],
    "requirements": ["<key requirement>", ...],
    "responsibilities": ["<key responsibility>", ...],
    "notablePoints": ["<brief relevant point, condition, warning, or differentiator>", ...]
  }
}`;
}

function parseAIResult(rawText: string): AIScoreResult {
  const parsed = JSON.parse(rawText || "{}") as Record<string, unknown>;
  const score = typeof parsed.score === "number" ? parsed.score : 0;
  const feedback =
    typeof parsed.feedback === "string"
      ? parsed.feedback
      : "No se pudo generar feedback.";
  const keywordsFound = cleanArray(parsed.keywordsFound);
  const cvKeywords = cleanArray(parsed.cvKeywords);

  return {
    score,
    feedback,
    keywordsFound,
    improvements: cleanArray(parsed.improvements),
    jobKeywords: cleanArray(parsed.jobKeywords),
    cvKeywords: cvKeywords.length > 0 ? cvKeywords : keywordsFound,
    matchingKeywords: cleanArray(parsed.matchingKeywords),
    missingKeywords: cleanArray(parsed.missingKeywords),
    jobKeyData: cleanJobKeyData(parsed.jobKeyData),
  };
}

export async function scoreCVWithAI(input: {
  apiKey: string;
  mode: AnalysisMode;
  text: string;
  model: string;
  context?: AIContext | null;
  jobDescription?: string | null;
  jobUrl?: string | null;
}): Promise<AIScoreResult> {
  const systemPrompt =
    input.mode === "general"
      ? buildGeneralPrompt(input.context ?? null)
      : buildJobMatchPrompt(input.jobDescription ?? "", input.jobUrl);
  const googleAI = new GoogleGenAI({ apiKey: input.apiKey });

  const response = await googleAI.models.generateContent({
    model: input.model,
    contents: [{ role: "user", parts: [{ text: input.text }] }],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
    },
  });

  return parseAIResult(response.text || "{}");
}
