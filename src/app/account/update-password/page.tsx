import { UpdatePasswordForm } from "@/components/update-password-form";
import { createClient } from "@/lib/supabase/server";
import { FileText } from "lucide-react";
import { redirect } from "next/navigation";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="min-h-screen overflow-hidden bg-[#09090f] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-[-280px] mx-auto h-[520px] max-w-4xl bg-indigo-600/[0.08] blur-[150px]" />
        <div className="absolute inset-x-0 bottom-[-320px] mx-auto h-[520px] max-w-3xl bg-violet-600/[0.06] blur-[150px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <section className="w-full max-w-[460px]">
          <div className="mb-7 flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold">CV Checker</span>
          </div>

          <UpdatePasswordForm />
        </section>
      </div>
    </main>
  );
}
