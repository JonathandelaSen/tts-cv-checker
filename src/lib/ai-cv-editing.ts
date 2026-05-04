import { GoogleGenAI } from "@google/genai";
import {
  normalizeStandardCVProfile,
  type StandardCVProfile,
} from "@/lib/cv-profile";
import type { CVTemplateId, CVTemplateLocale } from "@/lib/cv-templates";

export interface AICVEditInput {
  apiKey: string;
  model: string;
  profile: StandardCVProfile;
  instruction: string;
  templateId?: CVTemplateId;
  locale?: CVTemplateLocale;
  recommendations?: string[];
}

const SYSTEM_PROMPT = `You are an expert CV editor.

Edit the provided structured CV profile according to the user's natural-language instruction.

Critical rules:
- Return ONLY valid JSON matching the same structured CV profile schema.
- Preserve all factual information unless the user explicitly asks to replace or remove it.
- Do not invent employers, dates, titles, metrics, credentials, links, or skills.
- You may rewrite, shorten, reorder, or clarify existing text when requested.
- Keep the profile language consistent with the user's CV unless the user explicitly asks for another language.
- Do not change visual styling, colors, fonts, template configuration, or layout metadata.
- Keep every field inside the JSON profile shape; do not include commentary or markdown.`;

export function parseEditedCVProfile(rawText: string): StandardCVProfile {
  const parsed = JSON.parse(rawText || "{}") as unknown;
  const normalized = normalizeStandardCVProfile(parsed);
  const hasContent =
    Boolean(normalized.summary) ||
    Object.keys(normalized.basics ?? {}).length > 0 ||
    Boolean(normalized.experience?.length) ||
    Boolean(normalized.education?.length) ||
    Boolean(normalized.skills?.length);

  if (!hasContent) {
    throw new Error("AI response did not contain a usable CV profile.");
  }

  return normalized;
}

export async function editCVProfileWithAI(
  input: AICVEditInput
): Promise<StandardCVProfile> {
  const googleAI = new GoogleGenAI({ apiKey: input.apiKey });
  const recommendations = input.recommendations?.length
    ? `\nRelevant recommendations from previous analysis:\n${input.recommendations
        .map((item) => `- ${item}`)
        .join("\n")}`
    : "";

  const response = await googleAI.models.generateContent({
    model: input.model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Instruction:\n${input.instruction}\n\nTemplate context:\n${input.templateId ?? "unknown"} / ${input.locale ?? "es"}${recommendations}\n\nStructured CV profile JSON:\n${JSON.stringify(input.profile)}`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
    },
  });

  return parseEditedCVProfile(response.text || "{}");
}
