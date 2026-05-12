import { useEffect, useRef, useState } from "react";
import { CACHE_KEYS, DEFAULT_DATA_URL, DEFAULT_UI_TEXT, fileSpecs } from "../constants";
import { readStorageWithFallback, readRawWithFallback, safeWriteStorage, loadCachedFile, loadTranslationMap } from "../cache";
import { sanitizeUiText } from "../utils";
import { reparseFromCachedRecords } from "../parser";

const DEFAULT_LANGUAGES = ["CN", "EN", "ES", "ID", "VI", "TH", "MY"];
type DefaultData = {
  activeLang?: string;
  eventNotes?: Record<string, string>;
  events?: any[];
  fileNames?: Record<string, string>;
  languages?: string[];
  translationFiles?: any[];
  translationMaps?: Record<string, any>;
  uiText?: Record<string, unknown>;
};

async function loadDefaultData() {
  try {
    const response = await fetch(DEFAULT_DATA_URL, { cache: "no-cache" });
    if (!response.ok) return null;
    const data = (await response.json()) as DefaultData;
    return Array.isArray(data.events) ? data : null;
  } catch {
    return null;
  }
}

function mergeTranslationMaps(current: Record<string, any>, loaded: Record<string, any>) {
  const next = { ...current };
  for (const [language, map] of Object.entries(loaded)) {
    const hasLoadedKeys = map && typeof map === "object" && Object.keys(map).length > 0;
    if (hasLoadedKeys || !next[language]) next[language] = map || {};
  }
  return next;
}

export function useAppState() {
  const initialEvents = readStorageWithFallback(CACHE_KEYS.parsedEvents, "parsedEvents", []);
  const hasInitialEvents = Array.isArray(initialEvents) && initialEvents.length > 0;
  const defaultDataLoaded = useRef(false);
  const [events, setEvents] = useState(initialEvents);
  const [selected, setSelected] = useState<any>(null);
  const [month, setMonth] = useState(new Date());
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState(() => readRawWithFallback(CACHE_KEYS.activeLang, "activeLang", "CN"));
  const [languages, setLanguages] = useState<string[]>(() => readStorageWithFallback(CACHE_KEYS.languages, "languages", DEFAULT_LANGUAGES));
  const [newLang, setNewLang] = useState("");
  const [translationMaps, setTranslationMaps] = useState<Record<string, any>>({ CN: {} });
  const [fileNames, setFileNames] = useState<Record<string, string>>(() => readStorageWithFallback(CACHE_KEYS.fileMeta, "fileMeta", {}) as Record<string, string>);
  const [fileObjects, setFileObjects] = useState<Record<string, any>>({});
  const [translationFiles, setTranslationFiles] = useState<any[]>(() => readStorageWithFallback(CACHE_KEYS.translationFiles, "translationFiles", []) as any[]);
  const [status, setStatus] = useState<any>(() => readStorageWithFallback(CACHE_KEYS.status, "status", { type: "idle", message: "Upload config files, then parse them to refresh the calendar." }) as any);
  const [uiText, setUiText] = useState<Record<string, string>>(() => sanitizeUiText(readStorageWithFallback(CACHE_KEYS.uiText, "uiText", {}) as Record<string, unknown>));
  const [eventNotes, setEventNotes] = useState<Record<string, string>>(() => readStorageWithFallback(CACHE_KEYS.eventNotes, "eventNotes", {}) as Record<string, string>);
  const [hasDefaultData, setHasDefaultData] = useState(false);

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
      setTranslationMaps((prev) => mergeTranslationMaps(prev, loadedTranslations));

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

      const needsDefaultEvents = !restored.Event && !hasInitialEvents;
      const needsDefaultFileNames = Object.keys(fileNames).length === 0;
      const needsDefaultTranslationFiles = translationFiles.length === 0;

      if ((needsDefaultEvents || needsDefaultFileNames || needsDefaultTranslationFiles) && !defaultDataLoaded.current) {
        defaultDataLoaded.current = true;
        const defaultData = await loadDefaultData();
        if (cancelled || !defaultData) return;

        const defaultLanguages = Array.isArray(defaultData.languages) && defaultData.languages.length ? defaultData.languages : DEFAULT_LANGUAGES;
        const defaultActiveLang = defaultData.activeLang && defaultLanguages.includes(defaultData.activeLang) ? defaultData.activeLang : defaultLanguages[0] || "CN";
        const cleanedDefaultText = sanitizeUiText(defaultData.uiText || {});

        if (needsDefaultEvents) setEvents(defaultData.events || []);
        if (!languages.length || needsDefaultEvents) setLanguages(defaultLanguages);
        if (needsDefaultEvents) setLang(defaultActiveLang);
        setTranslationMaps((prev) => mergeTranslationMaps(prev, defaultData.translationMaps || {}));
        if (needsDefaultTranslationFiles) setTranslationFiles(defaultData.translationFiles || []);
        if (needsDefaultFileNames) setFileNames(defaultData.fileNames || {});
        if (needsDefaultEvents) setUiText(cleanedDefaultText);
        if (needsDefaultEvents) setEventNotes(defaultData.eventNotes || {});
        setHasDefaultData(true);
        setStatus({
          type: "success",
          message: `Loaded default data from ${DEFAULT_DATA_URL} with ${(defaultData.events || []).length} events.`,
        });
      }
    }

    restore();

    return () => {
      cancelled = true;
    };
  }, [languages]);

  return {
    events, setEvents,
    selected, setSelected,
    month, setMonth,
    query, setQuery,
    lang, setLang,
    languages, setLanguages,
    newLang, setNewLang,
    translationMaps, setTranslationMaps,
    fileNames, setFileNames,
    fileObjects, setFileObjects,
    translationFiles, setTranslationFiles,
    hasDefaultData,
    status, setStatus,
    uiText, setUiText,
    eventNotes, setEventNotes,
  };
}
