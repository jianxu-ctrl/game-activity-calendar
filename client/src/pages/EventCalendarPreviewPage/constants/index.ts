export const DAY_MS = 24 * 60 * 60 * 1000;
export const DB_NAME = "event_calendar_preview_cache_v10";
export const DB_STORE = "kv";
export const CDN_BASE_URL = "https://cdn.goldandglorymobile.com/web_assets/cdnpicture/";
export const DEFAULT_DATA_URL = "/event-calendar-preview/default-data.json";

export const LEGACY_DB_NAMES = [
  "event_calendar_preview_cache_v9",
  "event_calendar_preview_cache_v8",
  "event_calendar_preview_cache_v7",
  "event_calendar_preview_cache_v6",
  "event_calendar_preview_cache_v5",
  "event_calendar_preview_cache_v4",
  "event_calendar_preview_cache_v3",
  "event_calendar_preview_cache_v2",
  "event_calendar_preview_cache",
];

export const CACHE_KEYS = {
  fileMeta: "event_calendar_file_meta_v10",
  parsedEvents: "event_calendar_parsed_events_v10",
  languages: "event_calendar_languages_v10",
  activeLang: "event_calendar_active_lang_v10",
  translationFiles: "event_calendar_translation_files_v10",
  status: "event_calendar_status_v10",
  uiText: "event_calendar_ui_text_v10",
  eventNotes: "event_calendar_event_notes_v10",
};

export const LEGACY_CACHE_KEYS = ["v9", "v8", "v7", "v6", "v5", "v4", "v3", "v2"].map((v) => ({
  fileMeta: `event_calendar_file_meta_${v}`,
  parsedEvents: `event_calendar_parsed_events_${v}`,
  languages: `event_calendar_languages_${v}`,
  activeLang: `event_calendar_active_lang_${v}`,
  translationFiles: `event_calendar_translation_files_${v}`,
  status: `event_calendar_status_${v}`,
  uiText: `event_calendar_ui_text_${v}`,
}));

export const DEFAULT_UI_TEXT = {
  appBadge: "🗓️ Event Calendar Preview",
  appTitle: "Event Calendar Preview",
  appDesc: "Generate the gantt calendar from EventSetting and preview related overview, task, gacha and redeem configurations by EventID.",
  languageLabel: "Language",
  ganttTitle: "📊 Event Calendar Preview",
  ganttDesc: "Display all events for the current month on the left and the event duration timeline on the right.",
  prevMonth: "Last Month",
  nextMonth: "Next Month",
  monthTitleSuffix: "Event Calendar Preview",
  monthCountPrefix: "Showing",
  monthCountTotal: "Total",
  currentMonthList: "Current Month Event List",
  searchPlaceholder: "Search EventID / Name",
  emptyMonth: "No events in the current month.",
  uploadTitle: "📥 Config & Localization Upload",
  uploadDesc: "Uploaded files are cached in IndexedDB. Refreshing the page will not require re-uploading.",
  parseButton: "Parse Files & Refresh Calendar",
  selectFile: "Select File",
  uploadedTag: "Cached",
  translationTitle: "🌐 Localization Files",
  translationDesc: "Translation data is cached in IndexedDB and does not use localStorage quota.",
  uploadTranslation: "Upload To Current Language",
  importTransifyCurrent: "Import Current From Transify",
  importTransifyAll: "Import All From Transify",
  transifyImportHint: "Uses keys parsed from the current config. Admin token required.",
  currentLanguage: "Current Language",
  addLanguage: "Add Language",
  addButton: "Add",
  noTranslation: "No localization files uploaded.",
  detailEmpty: "Please select an event.",
  uiEditorTitle: "✏️ UI Text Editor",
  uiEditorDesc: "Edit titles, descriptions, buttons and search placeholders. Changes are persisted after refresh.",
  editText: "Edit Text",
  collapse: "Collapse",
  restoreDefault: "Restore Default",
  filesSummaryConfig: "Config Files",
  filesSummaryTranslation: "Translation Files",
  noConfigRows: "No config rows.",
  noMatchedReward: "No matched reward",
  noConsume: "No consume configured",
  noMatchedUrl: "No URL matched for current language",
  noBg: "No background configured",
  noDetail: "No related config to display for this event.",
  selectFileHint: "Click to select .xlsx / .xls file",
  addLanguagePlaceholder: "e.g. EN / JP / VI",
  deleteButton: "Delete",
};

export const fileSpecs = [
  { key: "Event", filename: "Event.xlsx", desc: "EventSetting / EventOverview / EventTask / EventGacha / EventRedeem" },
  { key: "CDNConfig", filename: "CDNConfig.xlsx", desc: "CDN resources and entry display config" },
  { key: "Merchant", filename: "Merchant.xlsx", desc: "Store and redeem config" },
  { key: "Mission", filename: "Mission.xlsx", desc: "Task conditions, copy and rewards" },
  { key: "Reward", filename: "Reward.xlsx", desc: "Reward groups and item quantities" },
  { key: "Item", filename: "Item.xlsx", desc: "Item ID, item name key and base data" },
  { key: "Gacha", filename: "Gacha.xlsx", desc: "Gacha pool, probability, cost and rewards" },
];

export const typeMeta = {
  overview: { label: "OverView", icon: "🖼️", tone: "bg-sky-50 text-sky-700 ring-sky-100" },
  task: { label: "Task", icon: "🧩", tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  gacha: { label: "Gacha", icon: "🎰", tone: "bg-violet-50 text-violet-700 ring-violet-100" },
  redeem: { label: "Redeem", icon: "🛒", tone: "bg-amber-50 text-amber-700 ring-amber-100" },
  bravo: { label: "Gacha", icon: "🎯", tone: "bg-rose-50 text-rose-700 ring-rose-100" },
};
