import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";
import path from "path";
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

Font.register({
  family: "InterPDF",
  src: path.join(process.cwd(), "public/fonts/Inter-Regular.ttf"),
});

Font.register({
  family: "InterPDFExtraBold",
  src: path.join(process.cwd(), "public/fonts/Inter-ExtraBold.ttf"),
});

// Disable hyphenation to match browser behavior and ensure same word wraps
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    padding: 62.36, // 22mm
    fontFamily: "InterPDF",
    fontWeight: 400,
    fontSize: 9.75, // 13px * 0.75
    lineHeight: 1.55,
    color: "#2d2d2d",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
    borderBottomWidth: 2.25, // 3px * 0.75
    borderBottomColor: "#111827",
    paddingBottom: 16.5,
    marginBottom: 19.5,
  },
  headerIdentity: {
    flex: 1,
    paddingRight: 9,
  },
  name: {
    fontFamily: "InterPDFExtraBold",
    fontSize: 28.5, // 38px * 0.75
    fontWeight: 400,
    color: "#101010",
    marginBottom: 6,
    lineHeight: 1.1,
  },
  headline: {
    fontSize: 12.75, // 17px * 0.75
    fontWeight: 400,
    color: "#505050",
    marginBottom: 4.5,
    lineHeight: 1.2,
  },
  contact: {
    flexShrink: 0,
    width: 165,
    color: "#4f4f4f",
    fontSize: 9, // 12px * 0.75
    textAlign: "right",
  },
  contactLine: {
    marginBottom: 3,
  },
  body: {
    flexDirection: "column",
    gap: 0,
  },
  section: {
    marginBottom: 19.5,
  },
  sectionTitle: {
    fontFamily: "InterPDFExtraBold",
    fontWeight: 400,
    fontSize: 9, // 12px * 0.75
    letterSpacing: 0,
    textTransform: "uppercase",
    color: "#161616",
    borderBottomWidth: 0.75, // 1px * 0.75
    borderBottomColor: "#dfd9ce",
    paddingBottom: 4.5,
    marginBottom: 10,
  },
  summary: {
    color: "#2d2d2d",
    fontSize: 9.75,
    lineHeight: 1.55,
  },
  item: {
    marginBottom: 13.5,
  },
  itemHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
    marginBottom: 3,
  },
  itemHeadMain: {
    flexGrow: 1,
    flexShrink: 1,
  },
  itemTitle: {
    fontFamily: "InterPDFExtraBold",
    fontWeight: 400,
    fontSize: 11.25, // 15px * 0.75
    color: "#161616",
    lineHeight: 1.2,
  },
  itemMeta: {
    color: "#5a5a5a",
    fontSize: 9, // 12px * 0.75
  },
  itemDate: {
    flexGrow: 0,
    flexShrink: 0,
    width: 90,
    color: "#5a5a5a",
    fontSize: 9,
    textAlign: "right",
  },
  bulletContainer: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 11,
    fontSize: 9.75,
    color: "#2d2d2d",
  },
  bulletText: {
    flex: 1,
    color: "#2d2d2d",
    fontSize: 9.75,
    lineHeight: 1.55,
  },
  skillsGrid: {
    flexDirection: "column",
    gap: 9,
  },
  skillGroup: {
    marginBottom: 3,
  },
  skillTitle: {
    fontFamily: "InterPDFExtraBold",
    fontWeight: 400,
    fontSize: 11.25,
    color: "#161616",
    marginBottom: 1.5,
  },
  skillItems: {
    color: "#2d2d2d",
    fontSize: 9.75,
    lineHeight: 1.55,
  },
  tag: {
    color: "#2d2d2d",
    fontSize: 9.75,
    borderWidth: 0.75,
    borderColor: "#ded8ce",
    paddingVertical: 3,
    paddingHorizontal: 5.25,
    marginBottom: 6,
    marginRight: 6,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
});

const hasItems = <T,>(items?: T[]) => Array.isArray(items) && items.length > 0;

function dateRange(dates?: { start?: string; end?: string; current?: boolean }) {
  if (!dates?.start && !dates?.end) return "";
  if (dates.current) {
    return [dates.start, dates.end || "Present"].filter(Boolean).join(" - ");
  }
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
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BulletList({ items }: { items?: string[] }) {
  if (!hasItems(items)) return null;
  return (
    <View style={{ marginTop: 2 }}>
      {items?.map((item, index) => (
        <View key={index} style={styles.bulletContainer}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function ExperiencePDF({ item }: { item: StandardCVExperience }) {
  return (
    <View style={styles.item} wrap={false}>
      <View style={styles.itemHead}>
        <View style={styles.itemHeadMain}>
          <Text style={styles.itemTitle}>{item.role || item.company}</Text>
          <Text style={styles.itemMeta}>
            {[item.company, item.location].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <Text style={styles.itemDate}>{dateRange(item.dates)}</Text>
      </View>
      <BulletList items={item.bullets} />
    </View>
  );
}

function EducationPDF({ item }: { item: StandardCVEducation }) {
  return (
    <View style={styles.item} wrap={false}>
      <View style={styles.itemHead}>
        <View style={styles.itemHeadMain}>
          <Text style={styles.itemTitle}>{item.degree || item.institution}</Text>
          <Text style={styles.itemMeta}>
            {[item.institution, item.field, item.location]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        <Text style={styles.itemDate}>{dateRange(item.dates)}</Text>
      </View>
      <BulletList items={item.details} />
    </View>
  );
}

function NamedPDF({ item }: { item: StandardCVNamedItem }) {
  return (
    <View style={styles.item} wrap={false}>
      <View style={styles.itemHead}>
        <View style={styles.itemHeadMain}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          <Text style={styles.itemMeta}>
            {[item.issuer, item.organization, item.url].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <Text style={styles.itemDate}>{item.date}</Text>
      </View>
      {item.description && <Text style={styles.summary}>{item.description}</Text>}
      <BulletList items={item.bullets} />
    </View>
  );
}

function CVTemplateDocument({
  profile,
  templateId,
  locale,
}: {
  profile: StandardCVProfile;
  templateId: CVTemplateId;
  locale: CVTemplateLocale;
}) {
  const labels = getSectionLabels(locale);
  const basics = profile.basics ?? {};
  const documentVariant = "Linea";

  return (
    <Document
      title={basics.name ? `${basics.name} ${documentVariant} CV` : `${documentVariant} CV`}
      author={basics.name}
      language={locale}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerIdentity}>
            <Text style={styles.name}>{basics.name || "Untitled CV"}</Text>
            {basics.headline && (
              <Text style={styles.headline}>{basics.headline}</Text>
            )}
          </View>
          <View style={styles.contact}>
            {[basics.email, basics.phone, basics.location]
              .filter(Boolean)
              .map((item) => (
                <Text key={item} style={styles.contactLine}>
                  {item}
                </Text>
              ))}
            {basics.links?.map((link) => (
              <Text key={link.url} style={styles.contactLine}>
                {link.label || link.url}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.body}>
          {profile.summary && (
            <Section title={labels.about}>
              <Text style={styles.summary}>{profile.summary}</Text>
            </Section>
          )}
          {hasItems(profile.skills) && (
            <Section title={labels.skills}>
              <View style={styles.skillsGrid}>
                {profile.skills?.map((group, index) => (
                  <View key={index} style={styles.skillGroup}>
                    {group.name && (
                      <Text style={styles.skillTitle}>{group.name}</Text>
                    )}
                    <Text style={styles.skillItems}>{group.items?.join(", ")}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}
          {hasItems(profile.experience) && (
            <Section title={labels.experience}>
              {profile.experience?.map((item, index) => (
                <ExperiencePDF key={index} item={item} />
              ))}
            </Section>
          )}
          {hasItems(profile.projects) && (
            <Section title={labels.projects}>
              {profile.projects?.map((item, index) => (
                <NamedPDF key={index} item={item} />
              ))}
            </Section>
          )}
          {hasItems(profile.education) && (
            <Section title={labels.education}>
              {profile.education?.map((item, index) => (
                <EducationPDF key={index} item={item} />
              ))}
            </Section>
          )}
          {hasItems(profile.languages) && (
            <Section title={labels.languages}>
              <View style={styles.tagsContainer}>
                {profile.languages?.map((language, index) => (
                  <Text key={index} style={styles.tag}>
                    {[language.name, language.level].filter(Boolean).join(" · ")}
                  </Text>
                ))}
              </View>
            </Section>
          )}
          {hasItems(profile.certifications) && (
            <Section title={labels.certifications}>
              {profile.certifications?.map((item, index) => (
                <NamedPDF key={index} item={item} />
              ))}
            </Section>
          )}
        </View>
      </Page>
    </Document>
  );
}

export async function renderTemplatePDF(input: {
  profile: StandardCVProfile;
  templateId: CVTemplateId;
  locale: CVTemplateLocale;
}): Promise<Buffer> {
  return renderToBuffer(
    <CVTemplateDocument
      profile={input.profile}
      templateId={input.templateId}
      locale={input.locale}
    />
  );
}

export async function renderTemplatePDF(input: {
  profile: StandardCVProfile;
  templateId: CVTemplateId;
  locale: CVTemplateLocale;
}): Promise<Buffer> {
  return renderToBuffer(
    <CVTemplateDocument
      profile={input.profile}
      templateId={input.templateId}
      locale={input.locale}
    />
  );
}
