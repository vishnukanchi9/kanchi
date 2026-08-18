import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { education, experience, profile, projects, skills } from "@/lib/profile";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle">
          {profile.location}
        </p>
        <h1 className="mt-5 max-w-3xl font-serif text-[2.6rem] leading-[1.05] tracking-tight text-fg sm:text-6xl md:text-7xl">
          {profile.heroLead}
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          {profile.name} — {profile.focus}. {profile.heroBody}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/resume">
            <Button size="lg">Open resume</Button>
          </Link>
          <a href="#work">
            <Button size="lg" variant="outline">
              Try the labs
            </Button>
          </a>
        </div>
      </section>

      <section id="work" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-subtle">
                Selected work
              </p>
              <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
                Three systems, running here
              </h2>
            </div>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {projects.map((project) => (
              <article
                key={project.slug}
                className="grid gap-4 py-8 sm:grid-cols-[88px_1fr_auto] sm:items-start sm:gap-8 sm:py-10"
              >
                <span className="font-mono text-sm text-subtle">{project.index}</span>
                <div>
                  <h3 className="font-serif text-2xl tracking-tight text-fg sm:text-3xl">
                    {project.name}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                    {project.blurb}
                  </p>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">
                    {project.stack.join(" · ")}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <Link
                    to={project.href}
                    className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-fg"
                  >
                    Open lab
                    <ArrowUpRight className="size-4" />
                  </Link>
                  {"github" in project && project.github ? (
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-fg"
                    >
                      GitHub
                      <ArrowUpRight className="size-4" />
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[220px_1fr]">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-subtle">
            Experience
          </p>
          <div className="space-y-12">
            {experience.map((job) => (
              <article key={job.company}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h3 className="font-serif text-2xl tracking-tight">
                    {job.role}
                    <span className="text-muted">, {job.company}</span>
                  </h3>
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">
                    {job.start} — {job.end}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted">{job.place}</p>
                <ul className="mt-4 max-w-2xl space-y-2 text-sm leading-relaxed text-muted">
                  {job.bullets.map((b) => (
                    <li key={b} className="pl-4 -indent-4">
                      <span className="text-subtle">— </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[220px_1fr]">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-subtle">Notes</p>
          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <h3 className="font-serif text-2xl tracking-tight">Skills</h3>
              <dl className="mt-5 space-y-4">
                {skills.map((group) => (
                  <div key={group.label}>
                    <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
                      {group.label}
                    </dt>
                    <dd className="mt-1 text-sm text-muted">{group.items.join(", ")}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h3 className="font-serif text-2xl tracking-tight">Education</h3>
              <ul className="mt-5 space-y-5">
                {education.map((ed) => (
                  <li key={ed.school}>
                    <p className="text-sm text-fg">{ed.credential}</p>
                    <p className="text-sm text-muted">
                      {ed.school}, {ed.place}
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">
                      {ed.detail} · {ed.end}
                    </p>
                  </li>
                ))}
                <li>
                  <p className="text-sm text-fg">Google Associate Cloud Engineer</p>
                  <p className="text-sm text-muted">Google Cloud Certified</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
