import { useMemo } from "react";
import { text } from "../utils";

export function useTranslation(translationMaps: Record<string, any>, lang: string) {
  return useMemo(
    () => (value: unknown) => {
      const raw = text(value);
      if (!raw) return "";
      return (translationMaps[lang] && translationMaps[lang][raw]) || raw;
    },
    [translationMaps, lang],
  );
}
