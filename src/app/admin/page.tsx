import { redirect } from "next/navigation";
import AdminObservabilityDashboard from "@/components/admin-observability-dashboard";
import { isAdminUser } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!(await isAdminUser(user.id))) redirect("/");

  return <AdminObservabilityDashboard userEmail={user.email ?? null} />;
}
