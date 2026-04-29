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

test("password reset email is requested from the browser Supabase client", () => {
  assert.match(authFormSource, /@\/lib\/supabase\/client/);
  assert.match(authFormSource, /resetPasswordForEmail/);
  assert.doesNotMatch(authFormSource, /requestPasswordReset/);
});
