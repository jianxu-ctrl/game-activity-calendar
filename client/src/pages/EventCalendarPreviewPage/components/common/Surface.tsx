import React from "react";

export function Surface({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[1.75rem] border border-slate-200/80 bg-white/95 shadow-sm shadow-slate-200/70 backdrop-blur ${className}`}>
      {children}
    </section>
  );
}
