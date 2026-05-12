import { useEffect, useState } from "react";
import { CACHE_KEYS, DEFAULT_UI_TEXT, fileSpecs } from "../constants";
import { readStorageWithFallback, readRawWithFallback, safeWriteStorage, loadCachedFile, loadTranslationMap } from "../cache";
import { sanitizeUiText } from "../utils";
import { reparseFromCachedRecords } from "../parser";

export function useAppState() {
  const initialEvents = readStorageWithFallback(CACHE_KEYS.parsedEvents, "parsedEvents", []);
  const [events, setEvents] = useState(initialEvents);
  const [selected, setSelected] = useState<any>(null);
  const [month, setMonth] = useState(new Date());
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState(() => readRawWithFallback(CACHE_KEYS.activeLang, "activeLang", "CN"));
  const [languages, setLanguages] = useState<string[]>(() => readStorageWithFallback(CACHE_KEYS.languages, "languages", ["CN", "EN", "ES", "ID", "VI", "TH", "MY"]));
  const [newLang, setNewLang] = useState("");
  const [translationMaps, setTranslationMaps] = useState<Record<string, any>>({ CN: {} });
  const [fileNames, setFileNames] = useState<Record<string, string>>(() => readStorageWithFallback(CACHE_KEYS.fileMeta, "fileMeta", {}) as Record<string, string>);
  const [fileObjects, setFileObjects] = useState<Record<string, any>>({});
  const [translationFiles, setTranslationFiles] = useState<any[]>(() => readStorageWithFallback(CACHE_KEYS.translationFiles, "translationFiles", []) as any[]);
  const [status, setStatus] = useState<any>(() => readStorageWithFallback(CACHE_KEYS.status, "status", { type: "idle", message: "Upload config files, then parse them to refresh the calendar." }) as any);
  const [uiText, setUiText] = useState<Record<string, string>>(() => sanitizeUiText(readStorageWithFallback(CACHE_KEYS.uiText, "uiText", {}) as Record<string, unknown>));
  const [eventNotes, setEventNotes] = useState<Record<string, string>>(() => readStorageWithFallback(CACHE_KEYS.eventNotes, "eventNotes", {}) as Record<string, string>);

  useEffect(() => {
    const cleaned = sanitizeUiText(uiText);
    const changed = Object.keys(DEFAULT_UI_TEXT).some((key) => cleaned[key as keyof typeof cleaned] !== uiText[key as keyof typeof uiText]);
    if (changed) {
      setUiText(cleaned);
      safeWriteStorage(CACHE_KEYS.uiText, cleaned);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const restored: Record<string, any> = {};
      for (const spec of fileSpecs) {
        const cached = await loadCachedFile(spec.key).catch(() => null);
        if (cached) restored[spec.key] = cached;
      }

      const loadedTranslations: Record<string, any> = {};
      for (const language of languages) {
        loadedTranslations[language] = await loadTranslationMap(language).catch(() => ({}));
      }

      if (cancelled) return;
      setFileObjects(restored);
      setTranslationMaps((prev) => ({ ...prev, ...loadedTranslations }));

      if (restored.Event) {
        try {
          const reparsedEvents = reparseFromCachedRecords(restored);
          setEvents(reparsedEvents);
          setSelected((current: any) => {
            if (current && reparsedEvents.some((event: any) => event.eventId === current.eventId)) {
              return reparsedEvents.find((event: any) => event.eventId === current.eventId);
            }
            return null;
          });
        } catch (error) {
          console.error("Failed to reparse events:", error);
        }
      }
    }

    restore();

    return () => {
      cancelled = true;
    };
  }, [languages]);

  return {
    events,
    setEvents,
    selected,
    setSelected,
    month,
    setMonth,
    query,
    setQuery,
    lang,
    setLang,
    languages,
    setLanguages,
    newLang,
    setNewLang,
    translationMaps,
    setTranslationMaps,
    fileNames,
    setFileNames,
    fileObjects,
    setFileObjects,
    translationFiles,
    setTranslationFiles,
    status,
    setStatus,
    uiText,
    setUiText,
    eventNotes,
    setEventNotes,
  };
}
