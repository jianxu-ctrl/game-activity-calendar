import * as XLSX from "xlsx";
import { parseCSVLine } from "../utils";
import { sheetRows, text } from "../utils";

export function parseTranslationRows(rows: any[][], languageId: string) {
  const headerIndex = rows.findIndex((row) => row.some((cell) => ["key", "Key", "KEY"].includes(text(cell))));
  if (headerIndex < 0) return {};

  const headers = rows[headerIndex].map(text);
  const keyIndex = headers.findIndex((header) => ["key", "Key", "KEY", "TxtKey", "TextKey", "ID", "id"].includes(header));
  if (keyIndex < 0) return {};

  let valueIndex = headers.findIndex((header) => header === languageId);
  if (valueIndex < 0) {
    valueIndex = headers.findIndex((header) => ["Value", "value", "Text", "text", "Translation", "translation", "译文", "翻译", "内容"].includes(header));
  }
  if (valueIndex < 0) return {};

  const map: Record<string, string> = {};
  for (const row of rows.slice(headerIndex + 1)) {
    const key = text(row[keyIndex]);
    const value = text(row[valueIndex]);
    if (key && value) map[key] = value;
  }
  return map;
}

export function parseTranslationWorkbook(buffer: ArrayBuffer, filename: string, languageId: string) {
  const lower = text(filename).toLowerCase();
  if (lower.endsWith(".json")) {
    const content = new TextDecoder("utf-8").decode(buffer);
    const data = JSON.parse(content);
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    const firstValue = Object.values(data)[0];
    if (firstValue && typeof firstValue === "object" && !Array.isArray(firstValue)) {
      return data[languageId] || data[languageId.toUpperCase()] || data[languageId.toLowerCase()] || {};
    }
    return data;
  }

  if (lower.endsWith(".csv")) {
    const content = new TextDecoder("utf-8").decode(buffer);
    const rows = content
      .split("\n")
      .map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line))
      .filter((line) => text(line))
      .map(parseCSVLine);
    return parseTranslationRows(rows, languageId);
  }

  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  return parseTranslationRows(sheetRows(workbook, workbook.SheetNames[0]) as any[][], languageId);
}
