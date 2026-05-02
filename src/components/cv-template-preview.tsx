"use client";

import type React from "react";
import type {
  StandardCVEducation,
  StandardCVExperience,
  StandardCVNamedItem,
  StandardCVProfile,
} from "@/lib/cv-profile";
import {
  getSectionLabels,
  type CVTemplateId,
  type CVTemplateLocale,
} from "@/lib/cv-templates";

interface CVTemplatePreviewProps {
  profile: StandardCVProfile;
  templateId: CVTemplateId;
  locale: CVTemplateLocale;
  scale?: "card" | "full";
}

const hasItems = <T,>(items?: T[]) => Array.isArray(items) && items.length > 0;

function dateRange(
  dates?: { start?: string; end?: string; current?: boolean }
) {
  if (!dates?.start && !dates?.end) return "";
  if (dates.current) return [dates.start, dates.end || "Present"].filter(Boolean).join(" - ");
  return [dates.start, dates.end].filter(Boolean).join(" - ");
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="cvp-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ExperienceItem({ item }: { item: StandardCVExperience }) {
  return (
    <article className="cvp-item">
      <div className="cvp-item-head">
        <div>
          <h3>{item.role || item.company}</h3>
          <p>{[item.company, item.location].filter(Boolean).join(" · ")}</p>
        </div>
        <span>{dateRange(item.dates)}</span>
      </div>
      {hasItems(item.bullets) && (
        <ul>
          {item.bullets?.map((bullet, index) => <li key={index}>{bullet}</li>)}
        </ul>
      )}
    </article>
  );
}

function EducationItem({ item }: { item: StandardCVEducation }) {
  return (
    <article className="cvp-item">
      <div className="cvp-item-head">
        <div>
          <h3>{item.degree || item.institution}</h3>
          <p>
            {[item.institution, item.field, item.location]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span>{dateRange(item.dates)}</span>
      </div>
      {hasItems(item.details) && (
        <ul>
          {item.details?.map((detail, index) => <li key={index}>{detail}</li>)}
        </ul>
      )}
    </article>
  );
}

function NamedItem({ item }: { item: StandardCVNamedItem }) {
  return (
    <article className="cvp-item cvp-small-item">
      <div className="cvp-item-head">
        <div>
          <h3>{item.name}</h3>
          <p>{[item.issuer, item.organization, item.url].filter(Boolean).join(" · ")}</p>
        </div>
        <span>{item.date}</span>
      </div>
      {item.description && <p className="cvp-description">{item.description}</p>}
      {hasItems(item.bullets) && (
        <ul>
          {item.bullets?.map((bullet, index) => <li key={index}>{bullet}</li>)}
        </ul>
      )}
    </article>
  );
}

export default function CVTemplatePreview({
  profile,
  templateId,
  locale,
  scale = "full",
}: CVTemplatePreviewProps) {
  const labels = getSectionLabels(locale);
  const basics = profile.basics ?? {};
  const compact = templateId === "compact";

  return (
    <div
      className={`cvp-shell ${compact ? "cvp-compact" : "cvp-executive"} ${
        scale === "card" ? "cvp-card-scale" : ""
      }`}
    >
      <header className="cvp-header">
        <div>
          <h1>{basics.name || "Untitled CV"}</h1>
          {basics.headline && <p className="cvp-headline">{basics.headline}</p>}
        </div>
        <div className="cvp-contact">
          {[basics.email, basics.phone, basics.location]
            .filter(Boolean)
            .map((item) => (
              <span key={item}>{item}</span>
            ))}
          {basics.links?.map((link) => (
            <span key={link.url}>{link.label || link.url}</span>
          ))}
        </div>
      </header>

      <main className="cvp-body">
        {profile.summary && (
          <Section title={labels.about}>
            <p className="cvp-summary">{profile.summary}</p>
          </Section>
        )}
        {hasItems(profile.skills) && (
          <Section title={labels.skills}>
            <div className="cvp-skills">
              {profile.skills?.map((group, index) => (
                <div key={index}>
                  {group.name && <h3>{group.name}</h3>}
                  <p>{group.items?.join(", ")}</p>
                </div>
              ))}
            </div>
          </Section>
        )}
        {hasItems(profile.experience) && (
          <Section title={labels.experience}>
            {profile.experience?.map((item, index) => (
              <ExperienceItem key={index} item={item} />
            ))}
          </Section>
        )}
        {hasItems(profile.projects) && (
          <Section title={labels.projects}>
            {profile.projects?.map((item, index) => (
              <NamedItem key={index} item={item} />
            ))}
          </Section>
        )}
        {hasItems(profile.education) && (
          <Section title={labels.education}>
            {profile.education?.map((item, index) => (
              <EducationItem key={index} item={item} />
            ))}
          </Section>
        )}
        {hasItems(profile.languages) && (
          <Section title={labels.languages}>
            <div className="cvp-tags">
              {profile.languages?.map((language, index) => (
                <span key={index}>
                  {[language.name, language.level].filter(Boolean).join(" · ")}
                </span>
              ))}
            </div>
          </Section>
        )}
        {hasItems(profile.certifications) && (
          <Section title={labels.certifications}>
            {profile.certifications?.map((item, index) => (
              <NamedItem key={index} item={item} />
            ))}
          </Section>
        )}
      </main>
    </div>
  );
}
