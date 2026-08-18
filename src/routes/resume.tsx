import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  certifications,
  education,
  experience,
  profile,
  projects,
  skills,
} from "@/lib/profile";

export const Route = createFileRoute("/resume")({ component: ResumePage });

function ResumePage() {
  return (
    <main className="px-3 py-8 sm:px-6 sm:py-12">
      <div className="no-print mx-auto mb-6 flex max-w-[820px] flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-subtle">
            Document
          </p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight">Resume</h1>
          <p className="mt-1 max-w-md text-sm text-muted">
            Rebuilt as a single page. Print or save as PDF from the browser dialog.
          </p>
        </div>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" />
          Print / save PDF
        </Button>
      </div>

      <article className="resume-sheet mx-auto w-full max-w-[820px] rounded-xl bg-paper px-7 py-8 text-ink shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_30px_80px_-40px_rgba(0,0,0,0.7)] sm:px-11 sm:py-10">
        <header className="border-b border-rule pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-[2rem] leading-none tracking-tight text-ink sm:text-[2.35rem]">
                {profile.name}
              </h2>
              <p className="mt-2 text-[13px] font-medium tracking-wide text-ink-muted uppercase">
                {profile.title} · {profile.focus}
              </p>
            </div>
            <p className="text-[12px] leading-relaxed text-ink-muted sm:text-right">
              {profile.location}
              <br />
              <a href={profile.phoneHref} className="hover:text-ink">
                {profile.phone}
              </a>
              {" · "}
              <a href={profile.emailHref} className="hover:text-ink">
                {profile.email}
              </a>
              <br />
              <a href={profile.xHref} className="hover:text-ink">
                x.com/{profile.x}
              </a>
              {" · "}
              <a href={profile.githubHref} className="hover:text-ink">
                github.com/{profile.github}
              </a>
            </p>
          </div>
        </header>

        <Section title="Summary">
          <p className="text-[13px] leading-[1.55] text-ink">{profile.summary}</p>
        </Section>

        <Section title="Technical skills">
          <dl className="space-y-1">
            {skills.map((group) => (
              <div key={group.label} className="grid grid-cols-[118px_1fr] gap-2 text-[12.5px] leading-snug">
                <dt className="font-medium text-ink">{group.label}</dt>
                <dd className="text-ink-muted">{group.items.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Experience">
          <div className="space-y-3.5">
            {experience.map((job) => (
              <div key={job.company}>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
                  <p className="text-[13px] font-medium text-ink">
                    {job.role} · {job.company}
                  </p>
                  <p className="text-[11.5px] text-ink-muted">
                    {job.place} · {job.start} – {job.end}
                  </p>
                </div>
                <ul className="mt-1 space-y-0.5">
                  {job.bullets.map((b) => (
                    <li
                      key={b}
                      className="pl-3 text-[12.5px] leading-[1.45] text-ink-muted before:mr-1.5 before:text-rule before:content-['–']"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Selected systems">
          <div className="space-y-3">
            {projects.map((project) => (
              <div key={project.slug}>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
                  <p className="text-[13px] font-medium text-ink">
                    {project.name}
                    {"github" in project && project.github ? (
                      <>
                        {" · "}
                        <a href={project.github} className="font-normal text-ink-muted hover:text-ink">
                          GitHub
                        </a>
                      </>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-ink-muted">{project.stack.join(", ")}</p>
                </div>
                <ul className="mt-1 space-y-0.5">
                  {project.bullets.map((b) => (
                    <li
                      key={b}
                      className="pl-3 text-[12.5px] leading-[1.45] text-ink-muted before:mr-1.5 before:text-rule before:content-['–']"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Education & certification" last>
          <div className="space-y-1.5">
            {education.map((ed) => (
              <div
                key={ed.school}
                className="flex flex-col text-[12.5px] sm:flex-row sm:items-baseline sm:justify-between"
              >
                <p className="text-ink">
                  <span className="font-medium">{ed.credential}</span>
                  <span className="text-ink-muted">
                    {" "}
                    · {ed.school}, {ed.place}
                  </span>
                </p>
                <p className="text-[11.5px] text-ink-muted">
                  {ed.detail} · {ed.end}
                </p>
              </div>
            ))}
            {certifications.map((c) => (
              <p key={c.name} className="text-[12.5px] text-ink">
                <span className="font-medium">{c.name}</span>
                <span className="text-ink-muted"> · {c.issuer}</span>
              </p>
            ))}
          </div>
        </Section>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section className={last ? "pt-4" : "border-b border-rule py-4"}>
      <h3 className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}
