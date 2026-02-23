"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  status: string;
  description?: string;
  createdAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    apiFetch<Project[]>("/projects").then(setProjects).catch(console.error);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const project = await apiFetch<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
      setProjects([project, ...projects]);
      setName("");
      setDescription("");
      setShowCreate(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          New Project
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-4 border border-[var(--border)] rounded-lg space-y-3"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            required
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
            rows={2}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm"
          >
            Create
          </button>
        </form>
      )}

      <div className="space-y-2">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/dashboard/projects/${project.id}`}
            className="block p-4 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    {project.description}
                  </p>
                )}
              </div>
              <span className="text-xs px-2 py-1 bg-[var(--muted)] rounded-full">
                {project.status.replace(/_/g, " ")}
              </span>
            </div>
          </Link>
        ))}
        {projects.length === 0 && (
          <p className="text-[var(--muted-foreground)] text-center py-8">
            No projects yet. Create your first one.
          </p>
        )}
      </div>
    </div>
  );
}
