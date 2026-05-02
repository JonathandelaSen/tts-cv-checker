import { createHash } from "crypto";

export const CV_PROFILE_SCHEMA_VERSION = "cv-profile.v1";

export interface StandardCVLink {
  label?: string;
  url: string;
}

export interface StandardCVBasics {
  name?: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: StandardCVLink[];
}

export interface StandardCVDateRange {
  start?: string;
  end?: string;
  current?: boolean;
}

export interface StandardCVExperience {
  company?: string;
  role?: string;
  location?: string;
  dates?: StandardCVDateRange;
  bullets?: string[];
}

export interface StandardCVEducation {
  institution?: string;
  degree?: string;
  field?: string;
  location?: string;
  dates?: StandardCVDateRange;
  details?: string[];
}

export interface StandardCVSkillGroup {
  name?: string;
  items?: string[];
}

export interface StandardCVLanguage {
  name?: string;
  level?: string;
}

export interface StandardCVNamedItem {
  name?: string;
  issuer?: string;
  organization?: string;
  date?: string;
  url?: string;
  description?: string;
  bullets?: string[];
}

export interface StandardCVProfile {
  basics?: StandardCVBasics;
  summary?: string;
  experience?: StandardCVExperience[];
  education?: StandardCVEducation[];
  skills?: StandardCVSkillGroup[];
  languages?: StandardCVLanguage[];
  certifications?: StandardCVNamedItem[];
  projects?: StandardCVNamedItem[];
  awards?: StandardCVNamedItem[];
  publications?: StandardCVNamedItem[];
  volunteering?: StandardCVNamedItem[];
  [key: string]: unknown;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter(
          (item): item is string =>
            typeof item === "string" && Boolean(item.trim())
        )
        .map((item) => item.trim())
    : [];

const withDefined = <T extends Record<string, unknown>>(value: T): T => {
  for (const key of Object.keys(value)) {
    if (
      value[key] === undefined ||
      (Array.isArray(value[key]) && value[key].length === 0)
    ) {
      delete value[key];
    }
  }
  return value;
};

function normalizeDateRange(value: unknown): StandardCVDateRange | undefined {
  const raw = asRecord(value);
  const dates = withDefined({
    start: asString(raw.start),
    end: asString(raw.end),
    current: asBoolean(raw.current),
  });
  return Object.keys(dates).length > 0 ? dates : undefined;
}

function normalizeBasics(value: unknown): StandardCVBasics {
  const raw = asRecord(value);
  const links = Array.isArray(raw.links)
    ? raw.links
        .map((item): StandardCVLink | null => {
          const link = asRecord(item);
          const url = asString(link.url);
          if (!url) return null;
          const label = asString(link.label);
          return label ? { label, url } : { url };
        })
        .filter((item): item is StandardCVLink => item !== null)
    : [];

  return withDefined({
    name: asString(raw.name),
    headline: asString(raw.headline),
    email: asString(raw.email),
    phone: asString(raw.phone),
    location: asString(raw.location),
    links,
  });
}

function normalizeExperience(value: unknown): StandardCVExperience {
  const raw = asRecord(value);
  return withDefined({
    company: asString(raw.company),
    role: asString(raw.role),
    location: asString(raw.location),
    dates: normalizeDateRange(raw.dates),
    bullets: asStringArray(raw.bullets),
  });
}

function normalizeEducation(value: unknown): StandardCVEducation {
  const raw = asRecord(value);
  return withDefined({
    institution: asString(raw.institution),
    degree: asString(raw.degree),
    field: asString(raw.field),
    location: asString(raw.location),
    dates: normalizeDateRange(raw.dates),
    details: asStringArray(raw.details),
  });
}

function normalizeSkillGroup(value: unknown): StandardCVSkillGroup {
  const raw = asRecord(value);
  return withDefined({
    name: asString(raw.name),
    items: asStringArray(raw.items),
  });
}

function normalizeLanguage(value: unknown): StandardCVLanguage {
  const raw = asRecord(value);
  return withDefined({
    name: asString(raw.name),
    level: asString(raw.level),
  });
}

function normalizeNamedItem(value: unknown): StandardCVNamedItem {
  const raw = asRecord(value);
  return withDefined({
    name: asString(raw.name),
    issuer: asString(raw.issuer),
    organization: asString(raw.organization),
    date: asString(raw.date),
    url: asString(raw.url),
    description: asString(raw.description),
    bullets: asStringArray(raw.bullets),
  });
}

function normalizeArray<T>(
  value: unknown,
  normalize: (item: unknown) => T
): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalize)
    .filter((item) => Object.keys(item as Record<string, unknown>).length > 0);
}

export function normalizeStandardCVProfile(
  value: unknown
): StandardCVProfile {
  const raw = asRecord(value);
  return {
    basics: normalizeBasics(raw.basics),
    summary: asString(raw.summary),
    experience: normalizeArray(raw.experience, normalizeExperience),
    education: normalizeArray(raw.education, normalizeEducation),
    skills: normalizeArray(raw.skills, normalizeSkillGroup),
    languages: normalizeArray(raw.languages, normalizeLanguage),
    certifications: normalizeArray(raw.certifications, normalizeNamedItem),
    projects: normalizeArray(raw.projects, normalizeNamedItem),
    awards: normalizeArray(raw.awards, normalizeNamedItem),
    publications: normalizeArray(raw.publications, normalizeNamedItem),
    volunteering: normalizeArray(raw.volunteering, normalizeNamedItem),
  };
}

export function getBestCVText(input: {
  text_python?: string | null;
  text_pdfjs?: string | null;
  text_node?: string | null;
}): string | null {
  return input.text_python || input.text_pdfjs || input.text_node || null;
}

export function getCVSourceTextHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
