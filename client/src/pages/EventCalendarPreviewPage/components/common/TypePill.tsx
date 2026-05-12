import { typeMeta } from "../../constants";

export function TypePill({ type }: { type: string }) {
  const meta = typeMeta[type as keyof typeof typeMeta] || {
    label: type,
    icon: "•",
    tone: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${meta.tone}`}>
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  );
}
