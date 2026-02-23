import Link from "next/link";

export default function PortalHome() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome</h1>
      <p className="text-[var(--muted-foreground)]">
        View your projects and download shared files.
      </p>
      <Link
        href="/portal/projects"
        className="inline-block px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90"
      >
        View Projects
      </Link>
    </div>
  );
}
