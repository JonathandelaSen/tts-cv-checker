"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AuthFormState = {
  error?: string;
};

function getCredentials(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Introduce email y contraseña." };
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  return { email, password };
}

export async function signIn(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const credentials = getCredentials(formData);
  if ("error" in credentials) return { error: credentials.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    return { error: "No he podido iniciar sesión con esas credenciales." };
  }

  redirect("/");
}

export async function signUp(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const credentials = getCredentials(formData);
  if ("error" in credentials) return { error: credentials.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(credentials);

  if (error) {
    return { error: "No he podido crear la cuenta. Prueba con otro email." };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
