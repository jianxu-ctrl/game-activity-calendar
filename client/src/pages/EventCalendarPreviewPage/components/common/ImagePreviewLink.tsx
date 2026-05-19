import { useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ExternalLink } from "lucide-react";

const PREVIEW_WIDTH = 520;
const PREVIEW_HEIGHT = 320;

export function isImageUrl(value: unknown) {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;

  try {
    const url = new URL(trimmed);
    return /\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

export function ImagePreviewLink({
  url,
  className = "",
}: {
  url: string;
  className?: string;
}) {
  const [preview, setPreview] = useState({
    left: 0,
    top: 0,
    visible: false,
  });

  const updatePreviewPosition = (event: MouseEvent<HTMLElement>) => {
    const nextLeft = Math.min(
      event.clientX + 18,
      window.innerWidth - PREVIEW_WIDTH - 16,
    );
    const nextTop = Math.max(
      16,
      Math.min(event.clientY - 40, window.innerHeight - PREVIEW_HEIGHT - 16),
    );

    setPreview({
      left: Math.max(16, nextLeft),
      top: nextTop,
      visible: true,
    });
  };

  const previewLayer =
    preview.visible && typeof document !== "undefined"
      ? createPortal(
          <div
            className="pointer-events-none fixed z-[9999] overflow-hidden rounded-2xl border border-slate-300 bg-slate-950 p-2 shadow-2xl shadow-slate-400/50"
            style={{
              height: PREVIEW_HEIGHT,
              left: preview.left,
              top: preview.top,
              width: PREVIEW_WIDTH,
            }}
          >
            <img
              src={url}
              alt="Large preview"
              className="h-full w-full rounded-xl object-contain"
              draggable={false}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        aria-label="Open image link"
        className={`group inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md ${className}`}
        onMouseEnter={updatePreviewPosition}
        onMouseMove={updatePreviewPosition}
        onMouseLeave={() => setPreview((current) => ({ ...current, visible: false }))}
      >
        <span className="flex h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-950">
          <img
            src={url}
            alt="Preview"
            className="h-full w-full object-contain"
            loading="lazy"
            draggable={false}
          />
        </span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-blue-600" />
      </a>

      {previewLayer}
    </>
  );
}
