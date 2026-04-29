import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const configSource = readFileSync(
  new URL("../supabase/config.toml", import.meta.url),
  "utf8"
);

const proxySource = readFileSync(
  new URL("../src/lib/supabase/proxy.ts", import.meta.url),
  "utf8"
);

const authFormSource = readFileSync(
  new URL("../src/components/auth-form.tsx", import.meta.url),
  "utf8"
);

const recoveryTemplateSource = readFileSync(
  new URL("../supabase/templates/recovery.html", import.meta.url),
  "utf8"
);

test("local Supabase allows password reset callback redirects", () => {
  assert.match(
    configSource,
    /http:\/\/127\.0\.0\.1:3000\/auth\/callback\*\*/
  );
  assert.match(
    configSource,
    /http:\/\/localhost:3000\/auth\/callback\*\*/
  );
});

test("proxy forwards root auth codes to the password recovery callback", () => {
  const rootCodeRedirectIndex = proxySource.indexOf('pathname === "/"');
  const loginRedirectIndex = proxySource.indexOf("!user && !isPublicPath");

  assert.notEqual(rootCodeRedirectIndex, -1);
  assert.notEqual(loginRedirectIndex, -1);
  assert.ok(
    rootCodeRedirectIndex < loginRedirectIndex,
    "root auth codes must be handled before unauthenticated login redirects"
  );
  assert.match(proxySource, /\/auth\/callback/);
  assert.match(proxySource, /\/account\/update-password/);
});

test("proxy lets server action requests return Next.js action responses", () => {
  const serverActionIndex = proxySource.indexOf("isServerAction");
  const loginRedirectIndex = proxySource.indexOf("!user && !isPublicPath");

  assert.notEqual(serverActionIndex, -1);
  assert.notEqual(loginRedirectIndex, -1);
  assert.ok(
    serverActionIndex < loginRedirectIndex,
    "server actions must not be converted into login HTML redirects"
  );
  assert.match(proxySource, /headers\.has\("next-action"\)/);
  assert.match(proxySource, /multipart\/form-data/);
});

test("password reset email is requested from the browser Supabase client", () => {
  assert.match(authFormSource, /@\/lib\/supabase\/client/);
  assert.match(authFormSource, /resetPasswordForEmail/);
  assert.doesNotMatch(authFormSource, /requestPasswordReset/);
});

test("local Supabase uses the versioned recovery email template", () => {
  assert.match(configSource, /\[auth\.email\.template\.recovery\]/);
  assert.match(configSource, /subject = "Restablece tu contraseña"/);
  assert.match(
    configSource,
    /content_path = "\.\/supabase\/templates\/recovery\.html"/
  );
});

test("recovery email template keeps the Supabase confirmation URL", () => {
  assert.match(recoveryTemplateSource, /\{\{ \.ConfirmationURL \}\}/);
  assert.match(recoveryTemplateSource, /Cambiar contraseña/);
});
