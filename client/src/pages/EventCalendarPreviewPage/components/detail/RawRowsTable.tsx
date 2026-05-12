import { stripRichText } from "../../utils";

export function RawRowsTable({ rows, t, uiText }: { rows: any[]; t: (value: unknown) => string; uiText: any }) {
  if (!rows || !rows.length) return <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-400">{uiText.noConfigRows}</div>;
  const displayRows = rows.slice(0, 12);
  const headers = Array.from(new Set(displayRows.flatMap((row) => Object.keys(row).filter((key) => key !== "__cells")))).slice(0, 6);

  return (
    <div className="overflow-auto rounded-xl border">
      <table className="w-full text-xs">
        <thead className="bg-slate-100 text-slate-700">
          <tr>{headers.map((header) => <th key={header} className="whitespace-nowrap p-2 text-left">{header}</th>)}</tr>
        </thead>
        <tbody>
          {displayRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t hover:bg-slate-50">
              {headers.map((header) => (
                <td key={header} className="max-w-48 truncate p-2" title={stripRichText(t(row[header]))}>
                  {stripRichText(t(row[header]))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
