import { type ReactNode, useState } from "react";
import { TypePill } from "./TypePill";

export function CollapsibleDetailSection({
  type,
  title,
  countLabel,
  children,
  defaultOpen = true,
}: {
  type: string;
  title: string;
  countLabel?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 bg-white px-3 py-3 text-left transition hover:bg-slate-50"
      >
        <div className="flex min-w-0 items-center gap-2">
          <TypePill type={type} />
          <span className="truncate font-semibold text-slate-900">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {countLabel && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{countLabel}</span>}
          <span className="text-sm font-bold text-slate-400">{open ? "−" : "+"}</span>
        </div>
      </button>
      {open && <div className="border-t border-slate-100 p-3">{children}</div>}
    </div>
  );
}
