import { Link } from 'react-router-dom';
import { CalendarDays, Eye, LayoutGrid } from 'lucide-react';

const tools = [
  {
    title: 'Event Pop-Up Calendar',
    description: 'Public calendar view for game activity schedules, filters, and detail previews.',
    href: '/calendar',
    icon: CalendarDays,
    action: 'Open calendar',
  },
  {
    title: 'Event Calendar Preview',
    description: 'Upload config workbooks, preview event timelines, and inspect related event details.',
    href: '/preview',
    icon: Eye,
    action: 'Open preview',
  },
];

export default function ToolsHomePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col justify-center py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <LayoutGrid className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Game Tools Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One place for calendar publishing and event configuration preview.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <Link
              key={tool.href}
              to={tool.href}
              className="group rounded-xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground opacity-90 transition group-hover:opacity-100">
                  {tool.action}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-foreground">{tool.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{tool.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
