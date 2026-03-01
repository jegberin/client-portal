"use client";

interface ProjectStatus {
  id: string;
  name: string;
  slug: string;
  color: string;
  order: number;
}

export function StatusPipeline({
  statuses,
  currentStatus,
  onStatusChange,
  disabled,
}: {
  statuses: ProjectStatus[];
  currentStatus: string;
  onStatusChange: (slug: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {statuses.map((s) => (
        <button
          key={s.id}
          onClick={() => onStatusChange(s.slug)}
          disabled={disabled}
          className="px-2.5 py-1 rounded-full text-xs font-medium transition-all disabled:cursor-not-allowed"
          style={{
            backgroundColor:
              currentStatus === s.slug ? s.color : "var(--muted)",
            color:
              currentStatus === s.slug ? "#fff" : "var(--foreground)",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}
