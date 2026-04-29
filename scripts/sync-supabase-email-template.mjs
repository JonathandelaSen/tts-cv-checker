import { readFile } from "node:fs/promises";

const SUBJECT = "Restablece tu contraseña";
const TEMPLATE_PATH = new URL("../supabase/templates/recovery.html", import.meta.url);
const { SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF } = process.env;

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function main() {
  const accessToken = requireEnv("SUPABASE_ACCESS_TOKEN", SUPABASE_ACCESS_TOKEN);
  const projectRef = requireEnv("SUPABASE_PROJECT_REF", SUPABASE_PROJECT_REF);
  const template = await readFile(TEMPLATE_PATH, "utf8");

  if (!template.includes("{{ .ConfirmationURL }}")) {
    throw new Error("Recovery template must include {{ .ConfirmationURL }}.");
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mailer_subjects_recovery: SUBJECT,
        mailer_templates_recovery_content: template,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Supabase Management API returned ${response.status} ${response.statusText}: ${body}`
    );
  }

  console.log("Supabase recovery email template synced.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
