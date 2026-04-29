import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actionsSource = readFileSync(
  new URL("../src/app/login/actions.ts", import.meta.url),
  "utf8"
);

const updatePasswordFormSource = readFileSync(
  new URL("../src/components/update-password-form.tsx", import.meta.url),
  "utf8"
);

function getFunctionBody(source, functionName) {
  const start = source.indexOf(`export async function ${functionName}`);
  assert.notEqual(start, -1, `${functionName} should exist`);

  const bodyStart = source.indexOf("{", start);
  let depth = 0;

  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      return source.slice(bodyStart + 1, index);
    }
  }

  throw new Error(`Could not parse ${functionName}`);
}

test("changePasswordWithCurrent reauthenticates before updating the password", () => {
  const body = getFunctionBody(actionsSource, "changePasswordWithCurrent");
  const reauthIndex = body.indexOf("signInWithPassword");
  const updateIndex = body.indexOf("updateUser");

  assert.notEqual(reauthIndex, -1);
  assert.notEqual(updateIndex, -1);
  assert.ok(
    reauthIndex < updateIndex,
    "current password must be verified before password update"
  );
});

test("password recovery redirects after the new password is saved", () => {
  const body = getFunctionBody(actionsSource, "updatePasswordFromRecovery");

  assert.match(body, /redirect\("\/"\)/);
  assert.match(body, /redirect\("\/login"\)/);
  assert.doesNotMatch(body, /Contraseña actualizada correctamente/);
  assert.doesNotMatch(updatePasswordFormSource, /Ir a configuración/);
  assert.doesNotMatch(updatePasswordFormSource, /href="\/\?view=settings"/);
});
