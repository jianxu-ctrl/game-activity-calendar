import React, { useState } from "react";
import { CACHE_KEYS, DEFAULT_UI_TEXT } from "../../constants";
import { safeWriteStorage } from "../../cache";
import { Surface } from "./Surface";

export function UITextEditor({ uiText, setUiText }: { uiText: Record<string, any>; setUiText: React.Dispatch<React.SetStateAction<Record<string, any>>> }) {
  const [open, setOpen] = useState(false);
  const fields: [string, string][] = [
    ["appBadge", "App Badge"],
    ["appTitle", "App Title"],
    ["appDesc", "App Description"],
    ["languageLabel", "Global Language Label"],
    ["ganttTitle", "Gantt Title"],
    ["ganttDesc", "Gantt Description"],
    ["prevMonth", "Previous Month Button"],
    ["nextMonth", "Next Month Button"],
    ["monthTitleSuffix", "Calendar Title After Month"],
    ["monthCountPrefix", "Month Count Prefix"],
    ["monthCountTotal", "Month Count Total"],
    ["currentMonthList", "Left List Title"],
    ["searchPlaceholder", "Search Placeholder"],
    ["uploadTitle", "Upload Area Title"],
    ["uploadDesc", "Upload Area Description"],
    ["parseButton", "Parse Button"],
    ["selectFile", "Select File Button"],
    ["uploadedTag", "Cached Tag"],
    ["translationTitle", "Localization Title"],
    ["translationDesc", "Localization Description"],
    ["uploadTranslation", "Upload Translation Button"],
    ["currentLanguage", "Current Language Label"],
    ["addLanguage", "Add Language Label"],
    ["addLanguagePlaceholder", "Add Language Placeholder"],
    ["addButton", "Add Button"],
    ["noTranslation", "No Translation Text"],
    ["deleteButton", "Delete Button"],
    ["uiEditorTitle", "UI Editor Title"],
    ["uiEditorDesc", "UI Editor Description"],
    ["editText", "Edit Text Button"],
    ["collapse", "Collapse Button"],
    ["restoreDefault", "Restore Default Button"],
  ];

  const update = (key: string, value: string) => {
    setUiText((prev) => {
      const next = { ...prev, [key]: value };
      safeWriteStorage(CACHE_KEYS.uiText, next);
      return next;
    });
  };

  const reset = () => {
    setUiText(DEFAULT_UI_TEXT);
    safeWriteStorage(CACHE_KEYS.uiText, DEFAULT_UI_TEXT);
  };

  return (
    <Surface className="mb-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{uiText.uiEditorTitle}</div>
          <div className="text-xs text-slate-500">{uiText.uiEditorDesc}</div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(!open)} className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            {open ? uiText.collapse : uiText.editText}
          </button>
          <button type="button" onClick={reset} className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-500 shadow-sm">
            {uiText.restoreDefault}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {fields.map(([key, label]) => (
            <label key={key} className="block rounded-xl border bg-slate-50 p-3">
              <div className="mb-1 text-xs font-semibold text-slate-500">{label}</div>
              <input value={uiText[key] || ""} onChange={(event) => update(key, event.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm" />
            </label>
          ))}
        </div>
      )}
    </Surface>
  );
}
