import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Uso: node scripts/make-admin.mjs <email>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Error: Asegúrate de que NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén definidas en el entorno o en un archivo .env.local / .env"
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log(`Buscando usuario con email: ${email}...`);

  let page = 1;
  let foundUser = null;

  // Paginamos sobre los usuarios ya que no hay un método directo getUserByEmail en supabase-js
  while (true) {
    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) {
      console.error("Error al listar usuarios:", error.message);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      break;
    }

    foundUser = users.find((u) => u.email === email);
    if (foundUser) {
      break;
    }

    page++;
  }

  if (!foundUser) {
    console.error(`No se encontró ningún usuario con el email ${email}`);
    process.exit(1);
  }

  console.log(`Usuario encontrado (ID: ${foundUser.id}). Añadiendo a la tabla admin_users...`);

  const { error: insertError } = await supabase
    .from("admin_users")
    .insert({ user_id: foundUser.id });

  if (insertError) {
    // Si el error es de clave duplicada (código 23505 de Postgres)
    if (insertError.code === "23505") {
      console.log(`El usuario ${email} ya era administrador.`);
      process.exit(0);
    }
    console.error("Error al hacer admin al usuario:", insertError.message);
    process.exit(1);
  }

  console.log(`El usuario ${email} ha sido promovido a administrador exitosamente.`);
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
