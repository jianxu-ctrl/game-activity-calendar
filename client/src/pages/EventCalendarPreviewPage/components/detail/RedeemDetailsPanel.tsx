import { stripRichText } from "../../utils";
import { CollapsibleDetailSection } from "../common/CollapsibleDetailSection";

export function RedeemDetailsPanel({ redeemDetails, t, uiText }: any) {
  if (!redeemDetails || !redeemDetails.length) return null;
  return (
    <CollapsibleDetailSection type="redeem" title="EventRedeem" countLabel={`${redeemDetails.length} Redeem Items`}>
      <div className="overflow-auto rounded-xl border">
        <table className="w-full text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="w-14 whitespace-nowrap p-2 text-left">Num</th>
              <th className="min-w-40 p-2 text-left">Reward</th>
              <th className="min-w-40 p-2 text-left">Consume</th>
            </tr>
          </thead>
          <tbody>
            {redeemDetails.map((item: any, index: number) => (
              <tr key={`${item.vaultId}-${index}`} className="border-t align-top">
                <td className="p-2 text-slate-700">{index + 1}</td>
                <td className="p-2">
                  {item.rewards && item.rewards.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.rewards.map((reward: any, rewardIndex: number) => (
                        <span key={`${reward.itemId}-${rewardIndex}`} className="rounded-full bg-white px-2 py-1 text-slate-700 ring-1 ring-slate-200">
                          {stripRichText(t(reward.itemNameKey))} * {reward.count}
                        </span>
                      ))}
                    </div>
                  ) : <span className="text-slate-400">{uiText.noMatchedReward}{item.rewardId ? ` RewardID: ${item.rewardId}` : ` ${item.debug || ""}`}</span>}
                </td>
                <td className="p-2">
                  {item.consumeItemId ? (
                    <span className="rounded-full bg-white px-2 py-1 text-slate-700 ring-1 ring-slate-200">{stripRichText(t(item.consumeNameKey))} * {item.consumeCount || "1"}</span>
                  ) : <span className="text-slate-400">{uiText.noConsume}{item.debug ? `; ${item.debug}` : ""}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleDetailSection>
  );
}
