import * as XLSX from "xlsx";
import { CDN_BASE_URL } from "../constants";
import { loadCachedFile } from "../cache";
import {
  cleanName,
  cellAt,
  getField,
  looksLikeTextKey,
  normalizeDate,
  normalizeId,
  normalizeLangKey,
  parseCSVLine,
  rowsToObjects,
  splitCompositeValue,
  stripRichText,
  text,
  formatDateTime,
} from "../utils";

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

export function buildRewardMap(rewardRows: any[]) {
  const map: Record<string, any[]> = {};

  for (const row of rewardRows) {
    const rewardId = normalizeId(getField(row, ["RewardID", "RewardId", "Rewardid", "奖励ID"]) || cellAt(row, 0));
    if (!rewardId || rewardId === "RewardID" || rewardId === "奖励ID") continue;

    const rewards: any[] = [];
    const columnPairs = [[3, 4], [6, 7], [9, 10], [12, 13], [15, 16]];

    for (const [itemColumn, countColumn] of columnPairs) {
      const itemId = normalizeId(cellAt(row, itemColumn));
      const count = normalizeId(cellAt(row, countColumn));
      if (itemId && !["Item1", "Item2", "Item3"].includes(itemId)) {
        rewards.push({ itemId, count: count || "1" });
      }
    }

    if (!rewards.length) {
      for (let i = 1; i <= 10; i += 1) {
        const itemId = normalizeId(getField(row, [
          `Item${i}`,
          `ItemID${i}`,
          `ItemId${i}`,
          `RewardItem${i}`,
          `RewardItemID${i}`,
          `RewardItemId${i}`,
          `${i}号奖励物的ItemID`,
          `${i}号奖励物的道具ID`,
          `奖励物${i}`,
        ]));
        const count = normalizeId(getField(row, [
          `Count${i}`,
          `ItemCount${i}`,
          `ItemCnt${i}`,
          `ItemNum${i}`,
          `RewardCount${i}`,
          `${i}号奖励物的数量`,
          `${i}号奖励物数量`,
        ]));
        if (itemId) rewards.push({ itemId, count: count || "1" });
      }
    }

    if (!rewards.length) {
      const itemIds = splitCompositeValue(getField(row, ["ItemID", "ItemId", "Itemid", "RewardItemID", "RewardItemId", "Item", "道具ID", "物品ID"]))
        .map(normalizeId)
        .filter(Boolean);
      const counts = splitCompositeValue(getField(row, ["ItemCount", "ItemCnt", "ItemNum", "ItemAmount", "RewardCount", "Count", "Num", "Number", "Amount", "数量", "道具数量"]))
        .map(normalizeId)
        .filter(Boolean);
      itemIds.forEach((itemId, index) => rewards.push({ itemId, count: counts[index] || counts[0] || "1" }));
    }

    if (!map[rewardId]) map[rewardId] = [];
    map[rewardId].push(...rewards);
  }

  return map;
}

export function buildItemNameMap(itemRows: any[]) {
  const map: Record<string, string> = {};

  for (const row of itemRows) {
    const itemId = normalizeId(getField(row, ["ItemID", "ItemId", "Itemid", "ID", "道具ID", "物品ID"]) || cellAt(row, 0));
    if (!itemId) continue;

    const explicitKey = text(getField(row, [
      "ItemNameKey",
      "ItemNameStringKey",
      "NameKey",
      "NameStringKey",
      "ItemStringKey",
      "StringKey",
      "TxtKey",
      "TextKey",
      "NameID",
      "NameId",
      "道具名称Key",
      "物品名称Key",
      "名称Key",
    ]));

    if (explicitKey && explicitKey !== "null" && !explicitKey.includes(",")) {
      map[itemId] = explicitKey;
      continue;
    }

    const nameLikeValue = text(getField(row, ["ItemName", "道具名称", "物品名称", "名称"]));
    if (looksLikeTextKey(nameLikeValue) && !nameLikeValue.includes(",")) {
      map[itemId] = nameLikeValue;
      continue;
    }

    const scannedKey = Object.values(row)
      .map(text)
      .filter(Boolean)
      .find((value) => looksLikeTextKey(value) && !value.includes(","));
    map[itemId] = scannedKey || nameLikeValue.split(",")[0] || itemId;
  }

  return map;
}

export function getMerchantVaultCandidates(row: Record<string, unknown>) {
  const explicit = text(getField(row, [
    "VaultID",
    "VaultId",
    "Vaultid",
    "ShopID",
    "ShopId",
    "MallID",
    "MallId",
    "商品类型",
    "商店ID",
    "兑换商店ID",
  ]));
  return [explicit, cellAt(row, 1), cellAt(row, 0)].filter(Boolean);
}

export function merchantRowMatchesVault(row: Record<string, unknown>, vaultId: unknown) {
  const id = text(vaultId);
  if (!id) return false;
  return getMerchantVaultCandidates(row).some((candidate) => text(candidate) === id);
}

export function getMerchantRewardId(row: Record<string, unknown>) {
  return text(getField(row, ["RewardID", "RewardId", "Rewardid", "Reward", "奖励ID", "奖励物", "奖励"]) || cellAt(row, 5) || cellAt(row, 2));
}

export function getMerchantConsumeItemId(row: Record<string, unknown>) {
  return text(getField(row, [
    "ConsumeItemID1",
    "ConsumeItemId1",
    "ConsumeItem1",
    "CostItemID1",
    "CostItemId1",
    "CostItem1",
    "ItemID1",
    "资源1",
    "消耗道具1",
    "消耗道具ID1",
    "货币1",
    "货币ID1",
  ]) || cellAt(row, 8) || cellAt(row, 7));
}

export function getMerchantConsumeCount(row: Record<string, unknown>) {
  return text(getField(row, [
    "ConsumeItemCount1",
    "ConsumeCount1",
    "ConsumeNum1",
    "CostCount1",
    "CostNum1",
    "Count1",
    "数量1",
    "消耗数量1",
    "货币数量1",
  ]) || cellAt(row, 9) || cellAt(row, 8));
}

export function buildCdnUrlMap(cdnRows: any[]) {
  const map: Record<string, Record<string, string>> = {};

  for (const row of cdnRows || []) {
    const cdnId = text(cellAt(row, 2));
    if (!cdnId || ["子类型", "CDNSubType", "Backend", "string"].includes(cdnId)) continue;

    const rawLang = text(cellAt(row, 3));
    const lang = normalizeLangKey(rawLang || "DEFAULT");
    const url = text(cellAt(row, 4));
    if (!url || ["null", "#N/A", "链接", "URL", "Backend"].includes(url)) continue;

    if (!map[cdnId]) map[cdnId] = {};
    map[cdnId][lang] = url;
    if (rawLang.toLowerCase() === "default") map[cdnId].DEFAULT = url;
  }

  return map;
}

export function pickCdnUrl(cdnMap: Record<string, Record<string, string>>, cdnId: unknown, lang: unknown) {
  const record = cdnMap[text(cdnId)] || {};
  const language = normalizeLangKey(lang);
  const rawUrl = record[language] || record.DEFAULT || record.CN || Object.values(record)[0] || "";
  if (!rawUrl) return "";
  const lower = rawUrl.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://")) return rawUrl;
  return `${CDN_BASE_URL}${rawUrl}`;
}

export function buildOverviewDetails(eventOverviewRows: any[], cdnMap: Record<string, Record<string, string>>) {
  return (eventOverviewRows || []).map((row) => {
    const name = text(getField(row, ["EventOverviewName"]));
    const bgRaw = text(getField(row, ["EventOverviewBg"]));
    const desc = text(getField(row, ["EventOverviewDesc"]));
    return { name, desc, bgRaw, bgIds: splitCompositeValue(bgRaw), cdnMap };
  });
}

export function getEventRedeemVaultId(row: Record<string, unknown>) {
  return text(getField(row, ["VaultID", "VaultId", "Vaultid", "ID", "兑换商店ID", "商店ID"]) || cellAt(row, 1) || cellAt(row, 0));
}

export function buildRedeemDetails(eventRedeemRows: any[], merchantRows: any[], rewardMap: Record<string, any[]>, itemNameMap: Record<string, string>) {
  const details: any[] = [];

  for (const redeemRow of eventRedeemRows || []) {
    const vaultId = getEventRedeemVaultId(redeemRow);
    if (!vaultId) {
      details.push({
        vaultId: "",
        num: details.length + 1,
        rewardId: "",
        rewards: [],
        consumeItemId: "",
        consumeNameKey: "",
        consumeCount: "",
        debug: "EventRedeem is linked, but VaultID was not found.",
      });
      continue;
    }

    const matched = (merchantRows || []).filter((row) => merchantRowMatchesVault(row, vaultId));
    if (!matched.length) {
      details.push({
        vaultId,
        num: details.length + 1,
        rewardId: "",
        rewards: [],
        consumeItemId: "",
        consumeNameKey: "",
        consumeCount: "",
        debug: `No MerchandiseList rows matched VaultID=${vaultId}.`,
      });
      continue;
    }

    matched.forEach((row) => {
      const rewardId = normalizeId(getMerchantRewardId(row));
      const rewards = (rewardMap[rewardId] || []).map((reward) => ({
        itemId: reward.itemId,
        itemNameKey: itemNameMap[reward.itemId] || reward.itemId,
        count: reward.count || "1",
      }));
      const consumeItemId = normalizeId(getMerchantConsumeItemId(row));
      const consumeCount = normalizeId(getMerchantConsumeCount(row));
      details.push({
        vaultId,
        num: details.length + 1,
        rewardId,
        rewards,
        consumeItemId,
        consumeNameKey: itemNameMap[consumeItemId] || consumeItemId,
        consumeCount: consumeCount || "1",
        debug: `VaultID=${vaultId}, RewardID=${rewardId}`,
      });
    });
  }

  return details;
}

export function buildBravoDetails(bravoRows: any[], gachaRecord: any, rewardMap: Record<string, any[]>, itemNameMap: Record<string, string>) {
  if (!gachaRecord || !gachaRecord.buffer) return [];

  const parsed = parseObjectsByAnyHeader(
    gachaRecord.buffer,
    "GachaReward",
    ["GachaID", "RewardID", "Weight"],
  );

  const result: any[] = [];

  for (const bravoRow of bravoRows || []) {
    const gachaId = text(getField(bravoRow, ["GachaID", "GachaId"])) || cellAt(bravoRow, 1);
    if (!gachaId) continue;

    const matched = parsed.rows.filter((row) => {
      const rowGachaId = text(getField(row, ["GachaID", "GachaId"])) || cellAt(row, 0);
      return rowGachaId === gachaId;
    });

    result.push({
      gachaId,
      rows: matched.map((row: any, index: number) => {
        const rewardId = normalizeId(text(getField(row, ["RewardID", "RewardId"])) || cellAt(row, 1));
        const rewards = (rewardMap[rewardId] || []).map((reward) => ({
          itemId: reward.itemId,
          itemNameKey: itemNameMap[reward.itemId] || reward.itemId,
          count: reward.count || "1",
        }));

        return {
          num: index + 1,
          rewardId,
          rewards,
          weight: text(getField(row, ["Weight", "权重"])) || cellAt(row, 3),
        };
      }),
    });
  }

  return result;
}

export function enrichEventsWithMissionRewardItem(
  events: any[],
  missionRecord: any,
  rewardRecord: any,
  itemRecord: any,
  merchantRecord: any,
  cdnRecord: any,
  gachaRecord: any,
) {
  const missionParsed = missionRecord && missionRecord.buffer
    ? parseObjectsByHeaderAnywhere(missionRecord.buffer, "Task", "TaskType")
    : { rows: [], sheetName: "", headerRow: -1 };
  const rewardParsed = rewardRecord && rewardRecord.buffer
    ? parseObjectsByHeaderAnywhere(rewardRecord.buffer, "Reward", "RewardID")
    : { rows: [], sheetName: "", headerRow: -1 };
  const itemParsed = itemRecord && itemRecord.buffer
    ? parseObjectsByHeaderAnywhere(itemRecord.buffer, "Item", "ItemID")
    : { rows: [], sheetName: "", headerRow: -1 };
  const merchantParsed = merchantRecord && merchantRecord.buffer
    ? parseObjectsByAnyHeader(merchantRecord.buffer, "MerchandiseList", ["VaultID", "ShopID", "RewardID", "商品ID", "商品类型", "资源1", "ConsumeItemID1"])
    : { rows: [], sheetName: "", headerRow: -1 };
  const cdnParsed = cdnRecord && cdnRecord.buffer
    ? parseRawSheetRows(cdnRecord.buffer, "CDNConfig")
    : { rows: [], sheetName: "", headerRow: -1 };

  const rewardMap = buildRewardMap(rewardParsed.rows);
  const itemNameMap = buildItemNameMap(itemParsed.rows);
  const cdnMap = buildCdnUrlMap(cdnParsed.rows);

  return events.map((event) => {
    const taskRows = event.modules && event.modules.task ? event.modules.task : [];
    const taskTypes = [...new Set(taskRows.map((row: any) => text(getField(row, ["TaskType", "任务类型", "Type"]))).filter(Boolean))];
    const taskDetails = taskTypes.map((taskType) => {
      const matched = missionParsed.rows.filter((row: any) => text(getField(row, ["TaskType", "任务类型", "Type"])) === taskType);
      return {
        taskType,
        debug: `Mission rows=${missionParsed.rows.length}`,
        tasks: matched.map((row: any) => {
          const rewardId = normalizeId(getField(row, ["RewardID", "RewardId", "Rewardid", "奖励ID", "Reward"]));
          const rewards = (rewardMap[rewardId] || []).map((reward) => ({
            itemId: reward.itemId,
            itemNameKey: itemNameMap[reward.itemId] || reward.itemId,
            count: reward.count || "1",
          }));
          return {
            taskId: text(getField(row, ["TaskID", "TaskId", "任务ID"])),
            titleKey: text(getField(row, ["TaskTitleStringKey", "TaskTitle", "任务标题"])),
            descKey: text(getField(row, ["TaskContextStringKey", "TaskDesc", "任务描述"])),
            rewardId,
            rewards,
          };
        }),
      };
    });

    const redeemRows = event.modules && event.modules.redeem ? event.modules.redeem : [];
    const overviewRows = event.modules && event.modules.overview ? event.modules.overview : [];

    return {
      ...event,
      modules: {
        ...(event.modules || {}),
        taskDetails,
        overviewDetails: buildOverviewDetails(overviewRows, cdnMap),
        redeemDetails: buildRedeemDetails(redeemRows, merchantParsed.rows, rewardMap, itemNameMap),
        bravoDetails: buildBravoDetails(event.modules && event.modules.bravo ? event.modules.bravo : [], gachaRecord, rewardMap, itemNameMap),
      },
    };
  });
}

export function reparseFromCachedRecords(records: Record<string, any>) {
  const eventFile = records.Event;
  if (!eventFile || !eventFile.buffer) return [];
  const result = parseEventWorkbook(eventFile.buffer);
  return enrichEventsWithMissionRewardItem(
    result.events,
    records.Mission || null,
    records.Reward || null,
    records.Item || null,
    records.Merchant || null,
    records.CDNConfig || null,
    records.Gacha || null,
  );
}

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

export function runParserTests() {
  const rows = [["EventID", "EventName", "StartTime", "EndTime"], ["1", "A", "2026-04-01", "2026-04-02"]];
  const parsed = rowsToObjects(rows, ["EventID", "EventName", "StartTime", "EndTime"]);
  return parsed.rows.length === 1 && parsed.rows[0].EventID === "1";
}

export function runTranslationTests() {
  return parseTranslationRows([["key", "CN", "EN"], ["TXT_A", "中文", "English"]], "EN").TXT_A === "English";
}

export function runRewardTests() {
  const map = buildRewardMap([
    { __cells: ["101", "", "", "410015", "3", "", "1250008", "2"] },
    { RewardID: "102", Item1: "410015,治疗药水,消耗品", Count1: "3" },
  ]);
  const itemMap = buildItemNameMap([{ __cells: ["410015"], ItemID: "410015", NameKey: "ITEM_NAME_CONSUMABLE_410011" }]);
  return Boolean(
    map["101"]
    && map["101"][0]
    && map["101"][0].itemId === "410015"
    && map["101"][0].count === "3"
    && map["101"][1]
    && map["101"][1].itemId === "1250008"
    && map["101"][1].count === "2"
    && map["102"]
    && map["102"][0]
    && map["102"][0].itemId === "410015"
    && itemMap["410015"] === "ITEM_NAME_CONSUMABLE_410011"
  );
}

export function runRedeemTests() {
  const rewardMap = { R1: [{ itemId: "I1", count: "2" }] };
  const itemMap = { I1: "TXT_REWARD", C1: "TXT_COST" };
  const details = buildRedeemDetails(
    [{ VaultID: "1017" }],
    [{ VaultID: "1017", RewardID: "R1", ConsumeItemID1: "C1", ConsumeItemCount1: "5" }, { VaultID: "10170", RewardID: "R1" }],
    rewardMap,
    itemMap,
  );
  return details.length === 1 && details[0].consumeNameKey === "TXT_COST" && details[0].consumeCount === "5";
}

export function runCdnTests() {
  const map = buildCdnUrlMap([
    { __cells: ["54957", "5", "585", "default", "event/xj_0_snowman_overview.png"] },
    { __cells: ["54961", "5", "588", "en", "event/xj_0_snowman_overview_step1_en.png"] },
  ]);
  return pickCdnUrl(map, "585", "EN") === `https://cdn.goldandglorymobile.com/web_assets/cdnpicture/event/xj_0_snowman_overview.png`
    && pickCdnUrl(map, "588", "EN") === `https://cdn.goldandglorymobile.com/web_assets/cdnpicture/event/xj_0_snowman_overview_step1_en.png`;
}

export function runRichTextTests() {
  return stripRichText("累计登录<color=#EEC981>1</color>天") === "累计登录1天";
}

export async function parseUploadedFiles(
  fileObjects: Record<string, any>,
  setEvents: (events: any[]) => void,
  setSelected: (selected: any) => void,
  setStatus: (status: any) => void,
  safeWriteStorage: (key: string, value: any) => void,
  CACHE_KEYS: any,
) {
  const eventFile = fileObjects.Event || await loadCachedFile("Event").catch(() => null);
  const missionFile = fileObjects.Mission || await loadCachedFile("Mission").catch(() => null);
  const rewardFile = fileObjects.Reward || await loadCachedFile("Reward").catch(() => null);
  const itemFile = fileObjects.Item || await loadCachedFile("Item").catch(() => null);
  const merchantFile = fileObjects.Merchant || await loadCachedFile("Merchant").catch(() => null);
  const cdnFile = fileObjects.CDNConfig || await loadCachedFile("CDNConfig").catch(() => null);

  if (!eventFile) {
    const nextStatus = { type: "error", message: "Please upload Event.xlsx first." };
    setStatus(nextStatus);
    safeWriteStorage(CACHE_KEYS.status, nextStatus);
    return;
  }

  try {
    const result = parseEventWorkbook(eventFile.buffer);
    const enrichedEvents = enrichEventsWithMissionRewardItem(result.events, missionFile, rewardFile, itemFile, merchantFile, cdnFile, fileObjects.Gacha || await loadCachedFile("Gacha").catch(() => null));
    setEvents(enrichedEvents);
    setSelected((current: any) => {
      if (current && enrichedEvents.some((event: any) => event.eventId === current.eventId)) {
        return enrichedEvents.find((event: any) => event.eventId === current.eventId);
      }
      return null;
    });
    safeWriteStorage(CACHE_KEYS.parsedEvents, enrichedEvents);
    const nextStatus = { type: "success", message: `Parsed ${result.sheetName}, header row ${result.headerRow}, ${enrichedEvents.length} events. Cached files will be reused after refresh.` };
    setStatus(nextStatus);
    safeWriteStorage(CACHE_KEYS.status, nextStatus);
  } catch (error) {
    setEvents([]);
    setSelected(null);
    safeWriteStorage(CACHE_KEYS.parsedEvents, []);
    const nextStatus = { type: "error", message: error && (error as Error).message ? (error as Error).message : String(error) };
    setStatus(nextStatus);
    safeWriteStorage(CACHE_KEYS.status, nextStatus);
  }
}

function findSheet(workbook: any, target: string) {
  const wanted = cleanName(target);
  return workbook.SheetNames.find((name: string) => cleanName(name) === wanted)
    || workbook.SheetNames.find((name: string) => cleanName(name).includes(wanted));
}

function sheetRows(workbook: any, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
}
