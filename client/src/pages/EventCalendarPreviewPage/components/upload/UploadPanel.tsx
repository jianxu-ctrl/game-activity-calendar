import { useState } from "react";
import { CACHE_KEYS, DEFAULT_UI_TEXT, fileSpecs } from "../../constants";
import { Surface } from "../common/Surface";

export function UploadPanel(props: any) {
  const uiText = props.uiText || DEFAULT_UI_TEXT;
  const status = props.status;
  const [configOpen, setConfigOpen] = useState(false);
  const [translationOpen, setTranslationOpen] = useState(false);

  let statusClass = "border-slate-200 bg-slate-50 text-slate-600";
  let statusTitle = "Status";

  if (status.type === "success") {
    statusClass = "border-emerald-200 bg-emerald-50 text-emerald-700";
    statusTitle = "Success";
  } else if (status.type === "error") {
    statusClass = "border-red-200 bg-red-50 text-red-700";
    statusTitle = "Error";
  } else if (status.type === "ready") {
    statusClass = "border-amber-200 bg-amber-50 text-amber-700";
    statusTitle = "Ready";
  }

  const hasBuiltInDefaultData = props.hasDefaultData || props.eventsCount > 0;
  const configFileCount = Object.keys(props.fileNames).length || (hasBuiltInDefaultData ? fileSpecs.length : 0);
  const translationFileCount = props.translationFiles.length || Object.values(props.translationCounts || {}).filter((count) => Number(count) > 0).length;
  const configFileNames = Object.fromEntries(fileSpecs.map((item) => [item.key, props.fileNames[item.key] || (hasBuiltInDefaultData ? "Built-in default data" : "")]));

  return (
    <Surface className="p-4">
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            type="button"
            disabled={props.isExportingDefaultData}
            aria-busy={props.isExportingDefaultData ? "true" : "false"}
            onClick={props.onExportDefaultData}
            className={`rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
              props.isExportingDefaultData ? "cursor-not-allowed opacity-70" : "hover:-translate-y-0.5 hover:shadow-md"
            }`}
          >
            {props.isExportingDefaultData ? "Exporting..." : "Export Default Data"}
          </button>
        </div>

        {status.message && (
          <div className={`rounded-2xl border p-3 text-sm ${statusClass}`}>
            <b>{statusTitle}</b>
            <span className="ml-2">{status.message}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setConfigOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
        >
          <div>
            <div className="text-lg font-bold">{uiText.uploadTitle}</div>
            <div className="text-xs text-slate-500">{uiText.uploadDesc}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {uiText.filesSummaryConfig} {configFileCount}/7
            </div>
            <span className="text-lg font-bold text-slate-500">{configOpen ? "−" : "+"}</span>
          </div>
        </button>

        {configOpen && (
          <div>
            {status.message && (
              <div className={`mb-4 rounded-2xl border p-3 text-sm ${statusClass}`}>
                <b>{statusTitle}</b>
                <span className="ml-2">{status.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {fileSpecs.map((item) => (
                <label
                  key={item.key}
                  className={`group flex cursor-pointer items-center justify-between gap-3 rounded-3xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${configFileNames[item.key] ? "border-emerald-200 bg-emerald-50/80" : "border-slate-200 bg-white"}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <b className="text-sm">{item.filename}</b>
                      {configFileNames[item.key] && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {uiText.uploadedTag}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-500">{item.desc}</div>
                    <div className={`mt-1 truncate text-xs ${configFileNames[item.key] ? "text-emerald-700" : "text-slate-400"}`}>
                      {configFileNames[item.key] || uiText.selectFileHint}
                    </div>
                  </div>

                  <span className="shrink-0 rounded-xl border bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm">
                    {uiText.selectFile}
                  </span>

                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(event) => props.onFile(item.key, event.target.files && event.target.files[0])}
                  />
                </label>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={props.onParse}
                className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {uiText.parseButton}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setTranslationOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
        >
          <div>
            <div className="font-semibold">{uiText.translationTitle}</div>
            <div className="text-xs text-slate-500">{uiText.translationDesc}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {uiText.filesSummaryTranslation} {translationFileCount}
            </div>
            <span className="text-lg font-bold text-slate-500">{translationOpen ? "−" : "+"}</span>
          </div>
        </button>

        {translationOpen && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            {status.message && (
              <div className={`mb-4 rounded-2xl border p-3 text-sm ${statusClass}`}>
                <b>{statusTitle}</b>
                <span className="ml-2">{status.message}</span>
              </div>
            )}

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <label className="cursor-pointer rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm">
                {uiText.uploadTranslation}
                <input
                  type="file"
                  accept=".json,.csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(event) => props.onFile("Translation", event.target.files && event.target.files[0])}
                />
              </label>
            </div>

            <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-xl border bg-white p-3">
                <div className="mb-2 text-sm font-semibold">{uiText.currentLanguage}</div>
                <select
                  value={props.activeLang}
                  onChange={(event) => {
                    props.setActiveLang(event.target.value);
                    localStorage.setItem(CACHE_KEYS.activeLang, event.target.value);
                  }}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                >
                  {props.languages.map((language: string) => (
                    <option key={language} value={language}>{language} ({props.translationCounts[language] || 0} keys)</option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border bg-white p-3">
                <div className="mb-2 text-sm font-semibold">{uiText.addLanguage}</div>
                <div className="flex gap-2">
                  <input
                    value={props.newLang}
                    onChange={(event) => props.setNewLang(event.target.value)}
                    placeholder={uiText.addLanguagePlaceholder}
                    className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={props.onAddLanguage}
                    className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    {uiText.addButton}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Surface>
  );
}
