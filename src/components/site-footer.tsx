import { profile } from "@/lib/profile";

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">
          {profile.name}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <a href={profile.emailHref} className="hover:text-fg">
            {profile.email}
          </a>
          <a href={profile.phoneHref} className="hover:text-fg">
            {profile.phone}
          </a>
          <a href={profile.xHref} className="hover:text-fg" target="_blank" rel="noreferrer">
            @{profile.x}
          </a>
          <a href={profile.githubHref} className="hover:text-fg" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
