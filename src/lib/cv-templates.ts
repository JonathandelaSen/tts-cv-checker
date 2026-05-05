import type { StandardCVProfile } from "@/lib/cv-profile";

export type CVTemplateId = "compact" | "classic" | "modern";
export type CVTemplateLocale = "es" | "en";

export interface CVTemplateDefinition {
  templateId: CVTemplateId;
  name: string;
  description: string;
  supportedSections: Array<keyof StandardCVProfile>;
  locales: CVTemplateLocale[];
  fixtureProfile: StandardCVProfile;
}

export const SECTION_LABELS: Record<
  CVTemplateLocale,
  Record<string, string>
> = {
  es: {
    about: "Resumen Profesional",
    experience: "Experiencia",
    education: "Educación",
    skills: "Competencias",
    languages: "Idiomas",
    technicalSkills: "Habilidades técnicas",
    certifications: "Certificaciones",
    projects: "Proyectos",
    awards: "Reconocimientos",
    publications: "Publicaciones",
    volunteering: "Voluntariado",
  },
  en: {
    about: "Summary",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    languages: "Languages",
    technicalSkills: "Technical Skills",
    certifications: "Certifications",
    projects: "Projects",
    awards: "Awards",
    publications: "Publications",
    volunteering: "Volunteering",
  },
};

const loremProfile: StandardCVProfile = {
  basics: {
    name: "Alex Morgan",
    headline: "Senior Product Designer",
    email: "alex.morgan@example.com",
    phone: "+34 600 000 000",
    location: "Madrid, Spain",
    links: [
      { label: "Portfolio", url: "alexmorgan.design" },
      { label: "LinkedIn", url: "linkedin.com/in/alexmorgan" },
    ],
  },
  summary:
    "Product designer focused on accessible systems, research-led decisions, and measurable customer outcomes across B2B platforms.",
  experience: [
    {
      role: "Senior Product Designer",
      company: "Northstar Labs",
      location: "Remote",
      dates: { start: "2022", end: "Present", current: true },
      bullets: [
        "Led discovery and design for a multi-market onboarding flow.",
        "Partnered with product and engineering to improve activation metrics.",
        "Built reusable patterns for complex dashboard workflows.",
      ],
    },
    {
      role: "UX Designer",
      company: "Orbit Studio",
      location: "Barcelona",
      dates: { start: "2019", end: "2022" },
      bullets: [
        "Designed research-backed improvements for SaaS reporting tools.",
        "Facilitated workshops with support, sales, and engineering teams.",
      ],
    },
  ],
  education: [
    {
      institution: "Universidad Complutense de Madrid",
      degree: "BA",
      field: "Design",
      dates: { start: "2015", end: "2019" },
    },
  ],
  skills: [
    { name: "Design", items: ["Product strategy", "UX research", "Systems"] },
    { name: "Tools", items: ["Figma", "FigJam", "Notion"] },
  ],
  technicalSkills: ["Figma", "FigJam", "Notion", "Miro", "Jira", "Abstract"],
  languages: [
    { name: "Spanish", level: "Native" },
    { name: "English", level: "C1" },
  ],
  certifications: [
    { name: "Accessibility Foundations", issuer: "W3C", date: "2024" },
  ],
  projects: [
    {
      name: "Design Ops Toolkit",
      description: "Reusable documentation kit for product teams.",
      bullets: ["Standardized component usage guidance across squads."],
    },
  ],
  awards: [
    { name: "Best UX Innovation", issuer: "Design Awards EU", date: "2023" },
  ],
  volunteering: [
    {
      name: "UX Mentor",
      organization: "ADPList",
      description: "Mentoring junior designers transitioning into product roles.",
    },
  ],
};

const ALL_SECTIONS: Array<keyof StandardCVProfile> = [
  "basics",
  "summary",
  "experience",
  "education",
  "skills",
  "technicalSkills",
  "languages",
  "certifications",
  "projects",
  "awards",
  "publications",
  "volunteering",
];

export const CV_TEMPLATES: CVTemplateDefinition[] = [
  {
    templateId: "compact",
    name: "Linea",
    description:
      "A single-column resume optimized for fast scanning and keyword visibility.",
    supportedSections: ALL_SECTIONS,
    locales: ["es", "en"],
    fixtureProfile: loremProfile,
  },
  {
    templateId: "classic",
    name: "Marco",
    description:
      "Traditional serif layout with centered header. Ideal for senior roles and formal industries.",
    supportedSections: ALL_SECTIONS,
    locales: ["es", "en"],
    fixtureProfile: loremProfile,
  },
  {
    templateId: "modern",
    name: "Pulso",
    description:
      "Bold contemporary design with strong typographic hierarchy. Great for tech and creative roles.",
    supportedSections: ALL_SECTIONS,
    locales: ["es", "en"],
    fixtureProfile: loremProfile,
  },
];

export function getCVTemplate(templateId: string): CVTemplateDefinition | null {
  return CV_TEMPLATES.find((template) => template.templateId === templateId) ?? null;
}

export function getSectionLabels(locale: string) {
  return SECTION_LABELS[locale as CVTemplateLocale] ?? SECTION_LABELS.es;
}
