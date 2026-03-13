import Link from "next/link";
import PortalFooter from "@/components/portal-footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight flex items-center justify-center gap-3">
              <img src="/logo.png" alt="Crettyard Digital logo" width={56} height={56} className="object-contain" />
              Crettyard Digital
            </h1>
            <p className="text-xl text-[var(--muted-foreground)] max-w-md">
              Client portal
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-[var(--primary)] text-white rounded font-medium hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>
      </div>
      <PortalFooter />
    </div>
  );
}
