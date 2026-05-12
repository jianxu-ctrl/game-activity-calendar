import { stripRichText } from "../../utils";
import { CollapsibleDetailSection } from "../common/CollapsibleDetailSection";

export function BravoDetailsPanel({ bravoDetails, t, uiText }: any) {
  if (!bravoDetails || !bravoDetails.length) return null;

  return (
    <CollapsibleDetailSection type="bravo" title="EventGachaBravo">
      {bravoDetails.map((group: any) => (
        <div key={group.gachaId} className="mb-4 overflow-auto rounded-xl border last:mb-0">
          <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            GachaID: {group.gachaId}
          </div>

          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="w-14 p-2 text-left">Num</th>
                <th className="min-w-40 p-2 text-left">Reward</th>
                <th className="p-2 text-left">Weight</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row: any) => (
                <tr key={`${group.gachaId}-${row.num}`} className="border-t align-top">
                  <td className="p-2">{row.num}</td>
                  <td className="p-2">
                    {row.rewards && row.rewards.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.rewards.map((reward: any, rewardIndex: number) => (
                          <span key={`${row.rewardId}-${reward.itemId}-${rewardIndex}`} className="rounded-full bg-white px-2 py-1 text-slate-700 ring-1 ring-slate-200">
                            {stripRichText(t(reward.itemNameKey))} * {reward.count}
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-slate-400">{uiText.noMatchedReward} RewardID: {row.rewardId}</span>}
                  </td>
                  <td className="p-2">{row.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </CollapsibleDetailSection>
  );
}
