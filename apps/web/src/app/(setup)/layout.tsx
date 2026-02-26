import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function getSessionWithRole() {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    const apiUrl = process.env.API_URL || "http://localhost:3001";

    const res = await fetch(`${apiUrl}/api/auth/get-session`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const session = await res.json();
    if (!session) return null;

    const memberRes = await fetch(
      `${apiUrl}/api/auth/organization/get-active-member`,
      {
        headers: { Cookie: cookieHeader },
        cache: "no-store",
      },
    );
    if (!memberRes.ok) return { ...session, role: null };
    const member = await memberRes.json();
    return { ...session, role: member?.role || null };
  } catch {
    return null;
  }
}

export default async function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionWithRole();

  if (!session) {
    redirect("/login");
  }

  // Only owners should see the setup wizard
  if (session.role !== "owner") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-4xl mx-auto p-8">{children}</main>
    </div>
  );
}
