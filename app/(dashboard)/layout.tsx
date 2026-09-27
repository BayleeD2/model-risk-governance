import { redirect } from "next/navigation";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile(user.id);
  if (!profile) redirect("/onboarding");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar orgName={profile.orgs.name} userEmail={user.email!} />
      <main className="flex-1 overflow-y-auto bg-zinc-50">{children}</main>
    </div>
  );
}
