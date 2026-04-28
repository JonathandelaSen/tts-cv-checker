import { AuthForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";
import { FileText } from "lucide-react";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/");

  return (
    <main className="min-h-screen overflow-hidden bg-[#09090f] text-zinc-100">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-x-0 top-[-280px] mx-auto h-[520px] max-w-4xl bg-indigo-600/[0.08] blur-[150px]" />
        <div className="absolute inset-x-0 bottom-[-320px] mx-auto h-[520px] max-w-3xl bg-violet-600/[0.06] blur-[150px]" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-5 py-10">
        <section className="w-full max-w-[460px]">
          <div className="mb-7 flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">CV Checker</span>
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-3xl font-black leading-tight tracking-normal text-zinc-50">
              Analiza y mejora tu CV para ATS
            </h1>
          </div>

          <AuthForm />
        </section>
      </div>
    </main>
  );
}
