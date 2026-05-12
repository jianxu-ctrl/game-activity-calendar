import * as XLSX from "xlsx";
import {
  cleanName,
  getField,
  normalizeDate,
  rowsToObjects,
  sheetRows,
  text,
  formatDateTime,
} from "../utils";

function findSheet(workbook: any, target: string) {
  const wanted = cleanName(target);
  return workbook.SheetNames.find((name: string) => cleanName(name) === wanted)
    || workbook.SheetNames.find((name: string) => cleanName(name).includes(wanted));
}

export function parseObjectsByHeaderAnywhere(buffer: ArrayBuffer | null, preferredSheetName: string, requiredHeader: string) {
  if (!buffer) return { rows: [], sheetName: "", headerRow: -1, headers: [] };
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = findSheet(workbook, preferredSheetName) || workbook.SheetNames[0];
  if (!sheetName) return { rows: [], sheetName: "", headerRow: -1, headers: [] };

  const rows = sheetRows(workbook, sheetName) as any[][];
  const wanted = cleanName(requiredHeader);
  let headerIndex = -1;

  for (let i = 0; i < rows.length; i += 1) {
    if ((rows[i] as any[]).map((cell: any) => cleanName(cell)).includes(wanted)) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex < 0) return { rows: [], sheetName, headerRow: -1, headers: [] };

  const headers = (rows[headerIndex] as any[]).map((header: any, index: number) => text(header) || `Column${index + 1}`);
  const objects: Record<string, unknown>[] = [];

  for (const row of rows.slice(headerIndex + 1) as any[][]) {
    if (!row.some((cell: any) => text(cell))) continue;
    const item: Record<string, unknown> = { __cells: row };
    headers.forEach((header, index) => {
      item[header] = row[index] ?? "";
    });
    objects.push(item);
  }

  return { rows: objects, sheetName, headerRow: headerIndex + 1, headers };
}

export function parseObjectsByAnyHeader(buffer: ArrayBuffer | null, preferredSheetName: string, requiredHeaders: string[]) {
  if (!buffer) return { rows: [], sheetName: "", headerRow: -1, headers: [] };
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = findSheet(workbook, preferredSheetName) || workbook.SheetNames[0];
  if (!sheetName) return { rows: [], sheetName: "", headerRow: -1, headers: [] };

  const rows = sheetRows(workbook, sheetName) as any[][];
  const wanted = requiredHeaders.map(cleanName);
  let headerIndex = -1;

  for (let i = 0; i < rows.length; i += 1) {
    const normalized = (rows[i] as any[]).map((cell: any) => cleanName(cell));
    if (wanted.some((header) => normalized.includes(header))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex < 0) return { rows: [], sheetName, headerRow: -1, headers: [] };

  const headers = (rows[headerIndex] as any[]).map((header: any, index: number) => text(header) || `Column${index + 1}`);
  const objects: Record<string, unknown>[] = [];

  for (const row of rows.slice(headerIndex + 1) as any[][]) {
    if (!row.some((cell: any) => text(cell))) continue;
    const item: Record<string, unknown> = { __cells: row };
    headers.forEach((header, index) => {
      item[header] = row[index] ?? "";
    });
    objects.push(item);
  }

  return { rows: objects, sheetName, headerRow: headerIndex + 1, headers };
}

export function parseRawSheetRows(buffer: ArrayBuffer | null, preferredSheetName: string) {
  if (!buffer) return { rows: [], sheetName: "", headerRow: 0, headers: [] };
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = findSheet(workbook, preferredSheetName) || workbook.SheetNames[0];
  if (!sheetName) return { rows: [], sheetName: "", headerRow: 0, headers: [] };
  const rows = (sheetRows(workbook, sheetName) as any[][])
    .filter((row: any[]) => row.some((cell: any) => text(cell)))
    .map((row: any[]) => ({ __cells: row }));
  return { rows, sheetName, headerRow: 0, headers: [] };
}

export function parseModuleRows(workbook: any, sheetName: string) {
  const actualSheet = findSheet(workbook, sheetName);
  if (!actualSheet) return {};
  const parsed = rowsToObjects(sheetRows(workbook, actualSheet) as any[][], ["EventID"]);
  const map: Record<string, any[]> = {};

  for (const row of parsed.rows) {
    const eventId = text(getField(row, ["EventID", "活动ID"]));
    if (!eventId || eventId === "活动ID" || eventId === "EventID") continue;
    if (!map[eventId]) map[eventId] = [];
    map[eventId].push(row);
  }

  return map;
}

export function parseEventOverviewRows(workbook: any) {
  const actualSheet = findSheet(workbook, "EventOverview");
  if (!actualSheet) return {};

  const rows = sheetRows(workbook, actualSheet) as any[][];
  let headerIndex = -1;
  let eventIdIndex = 0;
  let nameIndex = -1;
  let bgIndex = -1;
  let descIndex = -1;

  for (let i = 0; i < rows.length; i += 1) {
    const normalized = rows[i].map((cell: unknown) => cleanName(cell));
    const candidateEventIdIndex = normalized.indexOf("eventid");
    const candidateNameIndex = normalized.indexOf("eventoverviewname");
    const candidateBgIndex = normalized.indexOf("eventoverviewbg");
    const candidateDescIndex = normalized.indexOf("eventoverviewdesc");

    if (candidateEventIdIndex >= 0 && candidateNameIndex >= 0) {
      headerIndex = i;
      eventIdIndex = candidateEventIdIndex;
      nameIndex = candidateNameIndex;
      bgIndex = candidateBgIndex;
      descIndex = candidateDescIndex;
      break;
    }
  }

  if (headerIndex < 0) return parseModuleRows(workbook, "EventOverview");

  const map: Record<string, any[]> = {};
  for (const row of rows.slice(headerIndex + 1) as any[][]) {
    const eventId = text((row as any)[eventIdIndex]);
    if (!eventId || eventId === "EventID" || eventId === "活动ID") continue;
    if (!/^[0-9]+$/.test(eventId)) continue;

    const item = {
      __cells: row,
      EventID: eventId,
      EventOverviewName: nameIndex >= 0 ? (row as any)[nameIndex] : "",
      EventOverviewBg: bgIndex >= 0 ? (row as any)[bgIndex] : "",
      EventOverviewDesc: descIndex >= 0 ? (row as any)[descIndex] : "",
      __overviewColumns: {
        eventIdIndex,
        nameIndex,
        bgIndex,
        descIndex,
      },
    };

    if (!map[eventId]) map[eventId] = [];
    map[eventId].push(item);
  }

  return map;
}

export function parseEventWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const settingSheet = findSheet(workbook, "EventSetting") || workbook.SheetNames[0];
  const parsed = rowsToObjects(sheetRows(workbook, settingSheet) as any[][], ["EventID", "EventName", "StartTime", "EndTime"]);
  if (!parsed.rows.length) throw new Error("Missing EventSetting headers: EventID / EventName / StartTime / EndTime");

  const overviewMap = parseEventOverviewRows(workbook);
  const taskMap = parseModuleRows(workbook, "EventTask");
  const gachaMap = parseModuleRows(workbook, "EventGacha");
  const redeemMap = parseModuleRows(workbook, "EventRedeem");
  const bravoMap = parseModuleRows(workbook, "EventGachaBravo");

  const events: any[] = [];
  for (const row of parsed.rows) {
    const eventId = text(getField(row, ["EventID", "活动ID"]));
    const title = text(getField(row, ["EventName", "活动名"]));
    const desc = text(getField(row, ["EventDesc", "活动备注", "Desc"]));
    const start = formatDateTime(getField(row, ["StartTime", "开始时间"]));
    const end = formatDateTime(getField(row, ["EndTime", "结束时间"]));

    if (!eventId || eventId === "活动ID" || eventId === "EventID") continue;
    if (!normalizeDate(start) || !normalizeDate(end)) continue;

    const modules = {
      overview: overviewMap[eventId] || [],
      task: taskMap[eventId] || [],
      taskDetails: [],
      gacha: gachaMap[eventId] || [],
      redeem: redeemMap[eventId] || [],
      redeemDetails: [],
      bravo: bravoMap[eventId] || [],
    };

    const types: string[] = [];
    if (modules.overview.length) types.push("overview");
    if (modules.task.length) types.push("task");
    if (modules.gacha.length) types.push("gacha");
    if (modules.redeem.length) types.push("redeem");
    if (modules.bravo.length) types.push("bravo");
    if (!types.length) types.push("overview");

    events.push({ eventId, title: title || eventId, desc, start, end, modules, types });
  }

  events.sort((a, b) => (normalizeDate(a.start)?.getTime() ?? 0) - (normalizeDate(b.start)?.getTime() ?? 0) || Number(a.eventId) - Number(b.eventId));
  return { events, sheetName: settingSheet, headerRow: parsed.headerIndex + 1 };
}

export function runParserTests() {
  const rows = [["EventID", "EventName", "StartTime", "EndTime"], ["1", "A", "2026-04-01", "2026-04-02"]];
  const parsed = rowsToObjects(rows, ["EventID", "EventName", "StartTime", "EndTime"]);
  return parsed.rows.length === 1 && parsed.rows[0].EventID === "1";
}
