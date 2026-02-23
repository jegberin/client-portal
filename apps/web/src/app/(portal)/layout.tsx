import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";
import { getSession } from "@/lib/auth";

const API_URL = process.env.API_URL || "http://localhost:3001";

async function getBranding() {
  try {
    const cookieStore = await cookies();
    const res = await fetch(
      `${API_URL}/api/branding`,
      {
        headers: { Cookie: cookieStore.toString() },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function getLogoSrc(branding: { logoKey?: string; logoUrl?: string; organizationId?: string } | null) {
  if (!branding) return null;
  if (branding.logoKey) {
    return `${API_URL}/api/branding/logo/${branding.organizationId}`;
  }
  if (branding.logoUrl) {
    return branding.logoUrl;
  }
  return null;
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const branding = await getBranding();
  const logoSrc = getLogoSrc(branding);

  return (
    <div
      style={
        {
          "--primary": branding?.primaryColor || "#2563eb",
          "--accent": branding?.accentColor || "#f59e0b",
        } as React.CSSProperties
      }
    >
      <header className="border-b border-[var(--border)] px-6 py-4 flex items-center gap-3">
        {logoSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="Logo" className="h-8" />
        )}
        <span className="font-semibold flex-1">Client Portal</span>
        <SignOutButton />
      </header>
      <main className="max-w-4xl mx-auto p-8">{children}</main>
    </div>
  );
}
