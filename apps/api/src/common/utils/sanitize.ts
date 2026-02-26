/**
 * Sanitize a filename by stripping path traversal sequences and replacing
 * non-alphanumeric characters (except dot, dash, underscore, and space)
 * with underscores. Consecutive dots are collapsed to a single dot.
 * Returns "file" if the result would be empty.
 */
export function sanitizeFilename(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, "");
  return base.replace(/[^\w.\- ]/g, "_").replace(/\.{2,}/g, ".") || "file";
}
