import * as XLSX from "xlsx";
import { DEFAULT_UI_TEXT } from "../constants";

export function text(value: unknown) {
  return String(value ?? "").trim();
}

export function stripRichText(value: unknown) {
  const s = text(value);
  let out = "";
  let inTag = false;
  for (const ch of s) {
    if (ch === "<") {
      inTag = true;
      continue;
    }
    if (ch === ">") {
      inTag = false;
      continue;
    }
    if (!inTag) out += ch;
  }
  return out;
}

export function pad(value: unknown) {
  return String(value).padStart(2, "0");
}

export function splitByDelimiters(value: unknown, extraDelimiters: string[] = []) {
  const delimiters = new Set(["|", ",", ";", "，", "；", ...extraDelimiters]);
  const parts: string[] = [];
  let current = "";
  for (const ch of text(value)) {
    if (delimiters.has(ch) || ch === "\t" || ch === "\r" || ch === "\n") {
      if (text(current)) parts.push(text(current));
      current = "";
    } else {
      current += ch;
    }
  }
  if (text(current)) parts.push(text(current));
  return parts;
}

export function splitCompositeValue(value: unknown) {
  return splitByDelimiters(value);
}

export function normalizeId(value: unknown) {
  const raw = text(value);
  if (!raw || raw === "null" || raw === "#N/A") return "";
  return splitByDelimiters(raw, [" "])[0] || "";
}

export function normalizeDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = text(value);
  if (!raw) return null;
  const normalized = raw
    .split("/").join("-")
    .split("年").join("-")
    .split("月").join("-")
    .split("日").join(" ")
    .trim();
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(value: unknown) {
  const date = normalizeDate(value);
  if (!date) return text(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function monthRange(date: Date) {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59),
  };
}

export function intersectsMonth(event: { start: unknown; end: unknown }, month: Date) {
  const start = normalizeDate(event.start);
  const end = normalizeDate(event.end);
  if (!start || !end) return false;
  const range = monthRange(month);
  return end >= range.start && start <= range.end;
}

export function cleanName(value: unknown) {
  return text(value)
    .toLowerCase()
    .split("")
    .filter((ch) => (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9"))
    .join("");
}

export function findSheet(workbook: any, target: string) {
  const wanted = cleanName(target);
  return workbook.SheetNames.find((name: string) => cleanName(name) === wanted)
    || workbook.SheetNames.find((name: string) => cleanName(name).includes(wanted));
}

export function sheetRows(workbook: any, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
}

export function rowsToObjects(rows: any[][], requiredHeaders: string[]) {
  let headerIndex = -1;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i].map((cell) => text(cell));
    if (requiredHeaders.every((header) => row.includes(header))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex < 0) return { rows: [], headerIndex: -1, headers: [] };

  const headers = rows[headerIndex].map((header, index) => text(header) || `Column${index + 1}`);
  const objects: Record<string, unknown>[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    if (!row.some((cell) => text(cell))) continue;
    const item: Record<string, unknown> = { __cells: row };
    headers.forEach((header, index) => {
      item[header] = row[index] ?? "";
    });
    objects.push(item);
  }
  return { rows: objects, headerIndex, headers };
}

export function cellAt(row: any, index: number) {
  return text(row && row.__cells ? row.__cells[index] : "");
}

export function getField(row: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && text(row[name])) return row[name];
  }
  const normalized = Object.fromEntries(Object.keys(row).map((key) => [cleanName(key), key]));
  for (const name of names) {
    const key = normalized[cleanName(name)];
    if (key && row[key] !== undefined && row[key] !== null && text(row[key])) return row[key];
  }
  return "";
}

export function getExactField(row: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name) && text(row[name])) return row[name];
  }
  return "";
}

export function parseCSVLine(line: string) {
  const out: string[] = [];
  let cell = "";
  let quote = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && quote && next === '"') {
      cell += '"';
      i += 1;
    } else if (ch === '"') {
      quote = !quote;
    } else if (ch === "," && !quote) {
      out.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  out.push(cell);
  return out.map(text);
}

export function looksLikeTextKey(value: unknown) {
  const upper = text(value).toUpperCase();
  return upper.startsWith("TXT_")
    || upper.startsWith("TEXT_")
    || upper.startsWith("ITEM_")
    || upper.startsWith("NAME_")
    || upper.includes("_TITLE")
    || upper.includes("_NAME")
    || upper.includes("_DESC");
}

export function normalizeLangKey(value: unknown) {
  const raw = text(value).toUpperCase().split("-").join("").split("_").join("");
  if (!raw) return "DEFAULT";
  if (raw === "DEFAULT") return "DEFAULT";
  if (["CN", "ZH", "ZHCN", "ZHHANS", "CHS", "0"].includes(raw)) return "CN";
  if (["EN", "US", "ENUS", "ENG", "1"].includes(raw)) return "EN";
  if (["ES", "ESP", "SPANISH", "2"].includes(raw)) return "ES";
  if (["ID", "IND", "INDONESIAN", "3"].includes(raw)) return "ID";
  if (["VI", "VN", "VIE", "VIETNAMESE", "4"].includes(raw)) return "VI";
  if (["TH", "THAI", "5"].includes(raw)) return "TH";
  if (["MY", "MS", "MALAY", "6"].includes(raw)) return "MY";
  return raw;
}

export function sanitizeUiText(value: Record<string, unknown>) {
  const merged: Record<string, string> = { ...DEFAULT_UI_TEXT };
  const staleChineseText: Record<string, string[]> = {
    translationDesc: ["翻译数据存入 IndexedDB，不占用 localStorage 容量。", "翻译数据存入 IndexedDB，不占用 localStorage 容量", "翻译数据存入 IndexedDB，不占用 localStorage 容量。"],
  };

  Object.keys(value || {}).forEach((key) => {
    merged[key] = text(value[key]);
  });

  Object.keys(DEFAULT_UI_TEXT).forEach((key) => {
    const current = text(merged[key]);
    const defaultText = DEFAULT_UI_TEXT[key as keyof typeof DEFAULT_UI_TEXT];
    if (!current || current === `{uiText.${key}}`) merged[key] = defaultText;
    if (staleChineseText[key] && staleChineseText[key].includes(current)) merged[key] = defaultText;
  });
  return merged;
}
