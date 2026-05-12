import React from "react";

export function IconBox({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-lg text-white shadow-sm ${className}`}>
      {children}
    </span>
  );
}
