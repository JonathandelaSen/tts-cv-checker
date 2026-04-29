"use server";

import { CV_PDFS_BUCKET } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AuthFormState = {
  error?: string;
  message?: string;
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

function getPasswordChange(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!password || !confirmPassword) {
    return { error: "Introduce y confirma la nueva contraseña." };
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  return { password };
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

export async function updatePasswordFromRecovery(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const passwordResult = getPasswordChange(formData);
  if ("error" in passwordResult) return { error: passwordResult.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.auth.updateUser({
    password: passwordResult.password,
  });

  if (error) {
    return { error: "No he podido cambiar la contraseña." };
  }

  redirect("/");
}

export async function changePasswordWithCurrent(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const currentPassword = String(formData.get("currentPassword") || "");
  const passwordResult = getPasswordChange(formData);

  if (!currentPassword) {
    return { error: "Introduce tu contraseña actual." };
  }

  if ("error" in passwordResult) return { error: passwordResult.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Tienes que iniciar sesión de nuevo." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { error: "La contraseña actual no es correcta." };
  }

  const { error } = await supabase.auth.updateUser({
    password: passwordResult.password,
    current_password: currentPassword,
  });

  if (error) {
    return { error: "No he podido cambiar la contraseña actual." };
  }

  return { message: "Contraseña cambiada correctamente." };
}

export async function deleteAccount(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const emailConfirmation = String(
    formData.get("emailConfirmation") || ""
  ).trim();
  const password = String(formData.get("password") || "");

  if (!emailConfirmation || !password) {
    return {
      error: "Escribe tu email y contraseña para confirmar el borrado.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Tienes que iniciar sesión de nuevo." };
  }

  if (emailConfirmation.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "El email de confirmación no coincide." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (signInError) {
    return { error: "La contraseña no es correcta." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Borrado de cuenta no configurado",
    };
  }

  const { data: cvs, error: cvsError } = await supabase
    .from("cvs")
    .select("pdf_storage_path")
    .eq("user_id", user.id);
  const { data: analyses, error: analysesError } = await supabase
    .from("analyses")
    .select("pdf_storage_path")
    .eq("user_id", user.id);

  if (cvsError || analysesError) {
    return { error: "No he podido preparar el borrado de tus datos." };
  }

  const storagePaths = Array.from(
    new Set(
      [...(cvs ?? []), ...(analyses ?? [])]
        .map((item) => item.pdf_storage_path)
        .filter((path): path is string => Boolean(path))
    )
  );

  if (storagePaths.length > 0) {
    const { error: storageError } = await admin.storage
      .from(CV_PDFS_BUCKET)
      .remove(storagePaths);

    if (storageError) {
      return { error: "No he podido borrar los PDFs de la cuenta." };
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return { error: "No he podido borrar la cuenta." };
  }

  await supabase.auth.signOut();
  redirect("/login?accountDeleted=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
