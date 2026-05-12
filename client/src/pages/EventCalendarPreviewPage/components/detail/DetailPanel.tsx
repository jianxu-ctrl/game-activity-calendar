import { getEventRedeemVaultId } from "../../parser";
import { Surface } from "../common/Surface";
import { CollapsibleDetailSection } from "../common/CollapsibleDetailSection";
import { OverviewDetailsPanel } from "./OverviewDetailsPanel";
import { TaskDetailsPanel } from "./TaskDetailsPanel";
import { RedeemDetailsPanel } from "./RedeemDetailsPanel";
import { BravoDetailsPanel } from "./BravoDetailsPanel";
import { RawRowsTable } from "./RawRowsTable";

export function DetailPanel({ event, t, lang, uiText }: any) {
  if (!event) return <Surface className="p-6 text-sm text-slate-500">{uiText.detailEmpty}</Surface>;

  const modules = event.modules || {};
  const moduleList = [{ key: "gacha", label: "EventGacha", type: "gacha" }].filter((item) => (modules[item.key] || []).length > 0);

  const hasEventTasks = (modules.task || []).length > 0;
  const hasOverviewDetails = (modules.overviewDetails || []).length > 0;
  const fallbackRedeemDetails = modules.redeemDetails && modules.redeemDetails.length
    ? modules.redeemDetails
    : (modules.redeem || []).map((row: any, index: number) => ({
      vaultId: getEventRedeemVaultId(row),
      num: index + 1,
      rewardId: "",
      rewards: [],
      consumeItemId: "",
      consumeNameKey: "",
      consumeCount: "",
      debug: `EventRedeem linked, but MerchandiseList detail was not parsed. VaultID=${getEventRedeemVaultId(row) || "N/A"}`,
    }));
  const hasRedeemDetails = fallbackRedeemDetails.length > 0;

  return (
    <Surface className="sticky top-4 p-5">
      <div className="space-y-4">
        {hasOverviewDetails && <OverviewDetailsPanel overviewDetails={modules.overviewDetails || []} t={t} lang={lang} uiText={uiText} />}
        {hasEventTasks && <TaskDetailsPanel eventTasks={modules.task || []} taskDetails={modules.taskDetails || []} t={t} uiText={uiText} />}
        {hasRedeemDetails && <RedeemDetailsPanel redeemDetails={fallbackRedeemDetails} t={t} uiText={uiText} />}
        {modules.bravoDetails && modules.bravoDetails.length > 0 && <BravoDetailsPanel bravoDetails={modules.bravoDetails} t={t} uiText={uiText} />}
        {moduleList.map((item) => (
          <CollapsibleDetailSection key={item.key} type={item.type} title={item.label} countLabel={`${modules[item.key].length} Rows`}>
            <RawRowsTable rows={modules[item.key]} t={t} uiText={uiText} />
          </CollapsibleDetailSection>
        ))}
        {!hasOverviewDetails && !hasEventTasks && !hasRedeemDetails && !moduleList.length && <div className="text-sm text-slate-400">{uiText.noDetail}</div>}
      </div>
    </Surface>
  );
}
