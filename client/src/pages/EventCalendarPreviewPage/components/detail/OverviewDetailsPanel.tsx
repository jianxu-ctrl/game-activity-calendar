import { stripRichText } from "../../utils";
import { pickCdnUrl } from "../../parser";
import { CollapsibleDetailSection } from "../common/CollapsibleDetailSection";
import { ImagePreviewLink } from "../common/ImagePreviewLink";

export function OverviewDetailsPanel({ overviewDetails, t, lang, uiText }: any) {
  if (!overviewDetails || !overviewDetails.length) return null;
  return (
    <CollapsibleDetailSection type="overview" title="EventOverview" countLabel={`${overviewDetails.length} Rows`}>
      <div className="space-y-3 text-xs">
        {overviewDetails.map((item: any, index: number) => (
          <div key={index} className="rounded-xl bg-slate-50 p-3">
            <div className="grid grid-cols-[120px_1fr] gap-2 border-b border-slate-200 py-2 first:pt-0">
              <div className="font-semibold text-slate-600">EventOverviewName</div>
              <div className="text-slate-900">{stripRichText(t(item.name))}</div>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2 border-b border-slate-200 py-2">
              <div className="font-semibold text-slate-600">EventOverviewDesc</div>
              <div className="text-slate-900">{stripRichText(t(item.desc))}</div>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2 py-2">
              <div className="font-semibold text-slate-600">EventOverviewBg</div>
              <div>
                {item.bgIds && item.bgIds.length ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="w-28 border-b border-slate-200 px-3 py-2 text-left font-semibold">CDNid</th>
                          <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">Preview</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.bgIds.map((bgId: string) => {
                          const url = pickCdnUrl(item.cdnMap || {}, bgId, lang);
                          return (
                            <tr key={bgId} className="border-t border-slate-100 align-top">
                              <td className="px-3 py-2 font-mono text-slate-600">{bgId}</td>
                              <td className="break-all px-3 py-2">
                                {url ? (
                                  <ImagePreviewLink url={url} />
                                ) : (
                                  <span className="text-slate-400">{uiText.noMatchedUrl}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <span className="text-slate-400">{uiText.noBg}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </CollapsibleDetailSection>
  );
}
