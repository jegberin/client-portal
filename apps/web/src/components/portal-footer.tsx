export default function PortalFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="py-6 px-4 border-t border-[var(--border)]">
      <div className="max-w-sm mx-auto text-center space-y-2">
        <p className="text-xs text-[var(--muted-foreground)]">
          &copy; {year} Crettyard Digital. All rights reserved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
          <a
            href="https://digital.crettyard.com/terms-and-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
          >
            Terms &amp; Conditions
          </a>
          <span className="text-[var(--border)]" aria-hidden>·</span>
          <a
            href="https://digital.crettyard.com/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
          >
            Privacy Policy
          </a>
          <span className="text-[var(--border)]" aria-hidden>·</span>
          <a
            href="https://digital.crettyard.com/cookie-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
          >
            Cookie Policy
          </a>
        </div>
      </div>
    </footer>
  );
}
