import { CDN_BASE_URL } from "../constants";
import { cellAt, getField, looksLikeTextKey, normalizeId, normalizeLangKey, splitCompositeValue, text } from "../utils";
import { parseObjectsByAnyHeader } from "./eventParser";

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

    const matched = parsed.rows.filter((row: any) => {
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
