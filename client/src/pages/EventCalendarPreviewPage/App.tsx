import { useMemo, useState } from "react";
import { CACHE_KEYS, fileSpecs } from "./constants";
import { safeWriteStorage, cacheFile, saveTranslationMap, loadTranslationMap } from "./cache";
import { dbGet, dbPut } from "./cache";
import { useEffect } from "react";
import { parseTranslationWorkbook, parseUploadedFiles } from "./parser";
import { looksLikeTextKey, text } from "./utils";
import { importTransifyTranslations } from "./api/transify";
import { Gantt, DetailPanel, UploadPanel, UITextEditor } from "./components";
import { useAppState } from "./hooks";

const ADMIN_SYNC_TOKEN_STORAGE_KEY = "game-activity-admin-sync-token";
const TRANSIFY_SUPPORTED_LANGUAGES = ["CN", "EN", "ES", "MY", "ID", "TH", "VI"];
const CONFIG_DIRECTORY_HANDLE_KEY = "event-calendar-preview-config-directory-handle";

function collectTranslationKeys(value: unknown) {
  const keys = new Set<string>();
  const seen = new Set<object>();

  const visit = (item: unknown) => {
    if (typeof item === "string") {
      if (looksLikeTextKey(item)) keys.add(item.trim());
      return;
    }

    if (!item || typeof item !== "object") return;
    if (seen.has(item)) return;
    seen.add(item);

    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }

    Object.values(item as Record<string, unknown>).forEach(visit);
  };

  visit(value);
  return Array.from(keys).sort();
}

function getStoredAdminToken() {
  return window.sessionStorage.getItem(ADMIN_SYNC_TOKEN_STORAGE_KEY) || "";
}

function promptForAdminToken() {
  const current = getStoredAdminToken().trim();
  if (current) return current;

  const token = window.prompt("Enter the admin token to import translations from Transify:")?.trim() || "";
  if (token) window.sessionStorage.setItem(ADMIN_SYNC_TOKEN_STORAGE_KEY, token);
  return token;
}

function supportsDirectoryPicker() {
  return typeof (window as any).showDirectoryPicker === "function";
}

async function ensureDirectoryPermission(handle: any) {
  if (!handle || typeof handle.queryPermission !== "function") return true;

  const options = { mode: "read" };
  if ((await handle.queryPermission(options)) === "granted") return true;
  if (typeof handle.requestPermission !== "function") return false;
  return (await handle.requestPermission(options)) === "granted";
}

async function getFileFromDirectory(handle: any, filename: string) {
  const candidates = filename.endsWith(".xlsx")
    ? [filename, filename.replace(/\.xlsx$/i, ".xls")]
    : [filename];

  for (const candidate of candidates) {
    try {
      const fileHandle = await handle.getFileHandle(candidate);
      return await fileHandle.getFile();
    } catch {
      // Try the next supported Excel extension.
    }
  }

  return null;
}

export default function App() {
  const {
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
  } = useAppState();
  const [isExportingDefaultData, setIsExportingDefaultData] = useState(false);
  const [isImportingTransify, setIsImportingTransify] = useState(false);
  const [isImportingConfigDirectory, setIsImportingConfigDirectory] = useState(false);
  const [configDirectoryName, setConfigDirectoryName] = useState("");

  useEffect(() => {
    let cancelled = false;
    dbGet(CONFIG_DIRECTORY_HANDLE_KEY)
      .then((record: any) => {
        if (!cancelled && record?.name) setConfigDirectoryName(record.name);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const t = (value: unknown) => {
    const raw = text(value);
    if (!raw) return "";
    return (translationMaps[lang] && translationMaps[lang][raw]) || raw;
  };

  const translationCounts = useMemo(() => {
    return Object.fromEntries(languages.map((language) => [language, Object.keys(translationMaps[language] || {}).length]));
  }, [languages, translationMaps]);

  const updateStatus = (nextStatus: { type: string; message: string }) => {
    setStatus(nextStatus);
    safeWriteStorage(CACHE_KEYS.status, nextStatus);
  };

  const onAddLanguage = () => {
    const id = String(newLang).trim().toUpperCase();
    if (!id) {
      updateStatus({ type: "error", message: "Enter a language code first, for example JP, then click Add." });
      return;
    }
    const existed = languages.includes(id);
    setLanguages((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      safeWriteStorage(CACHE_KEYS.languages, next);
      return next;
    });
    setTranslationMaps((prev) => ({ ...prev, [id]: prev[id] || {} }));
    setLang(id);
    localStorage.setItem(CACHE_KEYS.activeLang, id);
    setNewLang("");
    updateStatus({ type: "success", message: existed ? `${id} already exists. Switched current language to ${id}.` : `Added ${id} to the language list.` });
  };

  const onExportDefaultData = async () => {
    if (isExportingDefaultData) return;

    if (!events.length) {
      updateStatus({ type: "error", message: "No parsed events to export. Upload and parse config files first." });
      return;
    }

    setIsExportingDefaultData(true);
    updateStatus({ type: "ready", message: "正在导出默认数据，请稍等..." });

    try {
      const loadedTranslationMaps = Object.fromEntries(
        await Promise.all(
          languages.map(async (language) => [
            language,
            await loadTranslationMap(language).catch(() => translationMaps[language] || {}),
          ]),
        ),
      );
      const payload = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        events,
        languages,
        activeLang: lang,
        translationMaps: loadedTranslationMaps,
        translationFiles,
        fileNames,
        uiText,
        eventNotes,
      };

      const output = `${JSON.stringify(payload, null, 2)}\n`;
      const blob = new Blob([output], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "default-data.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      const translatedLanguageCount = Object.values(loadedTranslationMaps).filter((map) => Object.keys(map || {}).length > 0).length;
      const sizeLabel = `, ${(blob.size / 1024 / 1024).toFixed(1)} MB`;
      updateStatus({
        type: "success",
        message: `导出成功：default-data.json（${events.length} 个活动，${translatedLanguageCount}/${languages.length} 个语言${sizeLabel}）。`,
      });
    } catch (error) {
      updateStatus({ type: "error", message: `Failed to export default data: ${(error as Error).message || String(error)}` });
    } finally {
      setIsExportingDefaultData(false);
    }
  };

  const parseUploaded = async () => {
    await parseUploadedFiles(fileObjects, setEvents, setSelected, setStatus, safeWriteStorage, CACHE_KEYS);
  };

  const onDeleteTranslation = async (item: any) => {
    await saveTranslationMap(item.lang, {});
    setTranslationMaps((prev) => ({ ...prev, [item.lang]: {} }));
    setTranslationFiles((prev) => {
      const next = prev.filter((x: any) => !(x.lang === item.lang && x.name === item.name));
      safeWriteStorage(CACHE_KEYS.translationFiles, next);
      return next;
    });
    updateStatus({ type: "success", message: `Deleted ${item.lang} translation file ${item.name}.` });
  };

  const onFile = async (key: string, file: File | null) => {
    if (!file) return;

    if (key === "Translation") {
      try {
        const record = await cacheFile(`Translation:${lang}:${file.name}`, file);
        const map = parseTranslationWorkbook(record.buffer, file.name, lang);
        const merged = { ...(translationMaps[lang] || {}), ...map };
        await saveTranslationMap(lang, merged);
        setTranslationMaps((prev) => ({ ...prev, [lang]: merged }));
        const item = { lang, name: file.name, count: Object.keys(map).length, updatedAt: Date.now() };
        setTranslationFiles((prev) => {
          const next = [...prev.filter((x: any) => !(x.lang === item.lang && x.name === item.name)), item];
          safeWriteStorage(CACHE_KEYS.translationFiles, next);
          return next;
        });
        updateStatus({ type: "success", message: `Imported ${Object.keys(map).length} keys for ${lang} from ${file.name}.` });
      } catch (error) {
        updateStatus({ type: "error", message: `Failed to parse translation file: ${(error as Error).message || String(error)}` });
      }
      return;
    }

    const record = await cacheFile(key, file);
    setFileNames((prev) => {
      const next = { ...prev, [key]: file.name };
      safeWriteStorage(CACHE_KEYS.fileMeta, next);
      return next;
    });
    setFileObjects((prev) => ({ ...prev, [key]: record }));
    updateStatus({ type: "ready", message: `Cached ${file.name}. Click parse to refresh the calendar.` });
  };

  const importConfigFilesFromDirectory = async (handle: any) => {
    if (isImportingConfigDirectory) return;

    const allowed = await ensureDirectoryPermission(handle);
    if (!allowed) {
      updateStatus({ type: "error", message: "Folder permission was not granted. Select the config folder again." });
      return;
    }

    setIsImportingConfigDirectory(true);
    updateStatus({ type: "ready", message: `Reading latest config Excel files from ${handle.name || "selected folder"}...` });

    try {
      const nextRecords: Record<string, any> = {};
      const nextFileNames: Record<string, string> = {};
      const missing: string[] = [];

      for (const spec of fileSpecs) {
        const file = await getFileFromDirectory(handle, spec.filename);
        if (!file) {
          missing.push(spec.filename);
          continue;
        }

        nextRecords[spec.key] = await cacheFile(spec.key, file);
        nextFileNames[spec.key] = file.name;
      }

      if (!Object.keys(nextRecords).length) {
        updateStatus({ type: "error", message: "No matching Excel files were found in this folder." });
        return;
      }

      const mergedFileObjects = { ...fileObjects, ...nextRecords };
      setFileObjects(mergedFileObjects);
      setFileNames((prev) => {
        const next = { ...prev, ...nextFileNames };
        safeWriteStorage(CACHE_KEYS.fileMeta, next);
        return next;
      });

      await parseUploadedFiles(mergedFileObjects, setEvents, setSelected, setStatus, safeWriteStorage, CACHE_KEYS);

      if (missing.length) {
        updateStatus({
          type: "ready",
          message: `Updated ${Object.keys(nextRecords).length} config files from ${handle.name || "selected folder"}. Missing: ${missing.join(", ")}.`,
        });
      }
    } catch (error) {
      updateStatus({ type: "error", message: `Failed to update from folder: ${(error as Error).message || String(error)}` });
    } finally {
      setIsImportingConfigDirectory(false);
    }
  };

  const onSelectConfigDirectory = async () => {
    if (!supportsDirectoryPicker()) {
      updateStatus({
        type: "error",
        message: "This browser does not support direct folder access. Use the single file upload buttons instead.",
      });
      return;
    }

    try {
      const handle = await (window as any).showDirectoryPicker({ mode: "read" });
      const name = handle.name || "Selected folder";
      setConfigDirectoryName(name);

      try {
        await dbPut(CONFIG_DIRECTORY_HANDLE_KEY, { name, handle });
      } catch {
        updateStatus({
          type: "ready",
          message: "Folder selected, but this browser could not remember it after refresh.",
        });
      }

      await importConfigFilesFromDirectory(handle);
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      updateStatus({ type: "error", message: `Failed to select config folder: ${(error as Error).message || String(error)}` });
    }
  };

  const onRefreshConfigDirectory = async () => {
    const stored = await dbGet(CONFIG_DIRECTORY_HANDLE_KEY).catch(() => null) as any;
    const handle = stored?.handle;

    if (!handle) {
      await onSelectConfigDirectory();
      return;
    }

    setConfigDirectoryName(stored.name || handle.name || "Selected folder");
    await importConfigFilesFromDirectory(handle);
  };

  const onImportTransify = async (scope: "used-current" | "full-current" | "full-all") => {
    if (isImportingTransify) return;

    const targetLanguages = scope === "full-all"
      ? TRANSIFY_SUPPORTED_LANGUAGES
      : [lang.toUpperCase()];
    const unsupported = targetLanguages.filter((language) => !TRANSIFY_SUPPORTED_LANGUAGES.includes(language));
    if (unsupported.length) {
      updateStatus({ type: "error", message: `Transify is not configured for: ${unsupported.join(", ")}.` });
      return;
    }

    const shouldImportFullResource = scope !== "used-current";
    const keys = shouldImportFullResource ? [] : collectTranslationKeys(events);
    if (!shouldImportFullResource && !keys.length) {
      updateStatus({ type: "error", message: "No translation keys were found. Upload and parse config files first." });
      return;
    }

    const adminToken = promptForAdminToken();
    if (!adminToken) {
      updateStatus({ type: "error", message: "Admin token is required to import from Transify." });
      return;
    }

    setIsImportingTransify(true);
    updateStatus({
      type: "ready",
      message: shouldImportFullResource
        ? `Importing full Transify resource for ${targetLanguages.join(", ")}...`
        : `Importing ${keys.length} used keys for ${targetLanguages.join(", ")} from Transify...`,
    });

    try {
      const result = await importTransifyTranslations({
        adminToken,
        languages: targetLanguages,
        keys,
      });
      const importedEntries = Object.entries(result.languages || {})
        .filter(([, item]) => !item.error && Object.keys(item.translations || {}).length > 0);

      if (!importedEntries.length) {
        updateStatus({
          type: result.errors?.length ? "error" : "ready",
          message: result.errors?.length
            ? `Transify import did not return usable translations: ${result.errors.join("; ")}`
            : "Transify import finished, but no matching translations were returned.",
        });
        return;
      }

      const nextTranslationMaps: Record<string, Record<string, string>> = {};
      const nextTranslationFiles = importedEntries.map(([language, item]) => ({
        lang: language,
        name: shouldImportFullResource
          ? `Transify full resource ${item.resourceId || "4115"}`
          : `Transify used keys ${item.resourceId || "4115"}`,
        count: Object.keys(item.translations || {}).length,
        updatedAt: Date.now(),
        source: shouldImportFullResource ? "transify-full" : "transify-used",
      }));

      for (const [language, item] of importedEntries) {
        const currentMap = (await loadTranslationMap(language).catch(() => translationMaps[language] || {})) as Record<string, string>;
        const merged = { ...(currentMap || {}), ...(item.translations || {}) };
        await saveTranslationMap(language, merged);
        nextTranslationMaps[language] = merged;
      }

      setTranslationMaps((prev) => ({ ...prev, ...nextTranslationMaps }));
      setLanguages((prev) => {
        const next = Array.from(new Set([...prev, ...importedEntries.map(([language]) => language)]));
        safeWriteStorage(CACHE_KEYS.languages, next);
        return next;
      });
      setTranslationFiles((prev) => {
        const next = [
          ...prev.filter((item: any) => !(
            (item.source === "transify" || item.source === "transify-full" || item.source === "transify-used") &&
            nextTranslationFiles.some((nextItem) => nextItem.lang === item.lang && nextItem.source === item.source)
          )),
          ...nextTranslationFiles,
        ];
        safeWriteStorage(CACHE_KEYS.translationFiles, next);
        return next;
      });

      const importedCount = importedEntries.reduce((sum, [, item]) => sum + Object.keys(item.translations || {}).length, 0);
      const partialError = result.errors?.length ? ` Partial errors: ${result.errors.join("; ")}` : "";
      updateStatus({
        type: result.errors?.length ? "ready" : "success",
        message: `Imported ${importedCount} translations for ${importedEntries.map(([language]) => language).join(", ")} from Transify.${partialError}`,
      });
    } catch (error) {
      if (String((error as Error).message || error).includes("Invalid admin sync token")) {
        window.sessionStorage.removeItem(ADMIN_SYNC_TOKEN_STORAGE_KEY);
      }
      updateStatus({ type: "error", message: `Failed to import from Transify: ${(error as Error).message || String(error)}` });
    } finally {
      setIsImportingTransify(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_30%),linear-gradient(to_bottom,#f8fafc,#eef2ff)] p-6 text-slate-900">
      <div className="mx-auto grid max-w-[1800px] grid-cols-12 gap-5">
        <main className="col-span-12 space-y-4 xl:col-span-8">
          <Gantt
            events={events}
            selected={selected}
            setSelected={setSelected}
            month={month}
            setMonth={setMonth}
            query={query}
            setQuery={setQuery}
            t={t}
            lang={lang}
            setLang={setLang}
            languages={languages}
            uiText={uiText}
            eventNotes={eventNotes}
            setEventNotes={setEventNotes}
          />
          <UploadPanel
            fileNames={fileNames}
            onFile={onFile}
            onParse={parseUploaded}
            onSelectConfigDirectory={onSelectConfigDirectory}
            onRefreshConfigDirectory={onRefreshConfigDirectory}
            isImportingConfigDirectory={isImportingConfigDirectory}
            configDirectoryName={configDirectoryName}
            onDeleteTranslation={onDeleteTranslation}
            status={status}
            translationFiles={translationFiles}
            languages={languages}
            activeLang={lang}
            setActiveLang={setLang}
            onAddLanguage={onAddLanguage}
            newLang={newLang}
            setNewLang={setNewLang}
            translationCounts={translationCounts}
            eventsCount={events.length}
            hasDefaultData={hasDefaultData}
            uiText={uiText}
            onExportDefaultData={onExportDefaultData}
            isExportingDefaultData={isExportingDefaultData}
            onImportTransify={onImportTransify}
            isImportingTransify={isImportingTransify}
          />
          <UITextEditor uiText={uiText} setUiText={setUiText} />
        </main>
        <aside className="col-span-12 xl:col-span-4">
          <DetailPanel event={selected} t={t} lang={lang} uiText={uiText} />
        </aside>
      </div>
    </div>
  );
}
