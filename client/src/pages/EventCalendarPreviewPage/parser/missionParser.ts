import { parseEventWorkbook, parseObjectsByAnyHeader, parseObjectsByHeaderAnywhere, parseRawSheetRows } from "./eventParser";
import { buildBravoDetails, buildCdnUrlMap, buildItemNameMap, buildRedeemDetails, buildRewardMap, buildOverviewDetails } from "./rewardParser";
import { getField, normalizeId, text } from "../utils";

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
