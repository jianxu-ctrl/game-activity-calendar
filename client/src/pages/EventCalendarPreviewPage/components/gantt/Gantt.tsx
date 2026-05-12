import { useMemo } from "react";
import { CACHE_KEYS, DAY_MS } from "../../constants";
import { safeWriteStorage } from "../../cache";
import { stripRichText, text, getDaysInMonth, intersectsMonth, monthRange, normalizeDate } from "../../utils";
import { Surface } from "../common/Surface";
import { IconBox } from "../common/IconBox";
import { TypePill } from "../common/TypePill";

function cleanMonthTitleSuffix(value: unknown) {
  const suffix = stripRichText(value)
    .replace(/^\d{4}\s*(?:年|\/|-)\s*\d{1,2}\s*月?\s*/u, "")
    .replace(/^年\s*\d{1,2}\s*月\s*/u, "")
    .replace(/^\d{1,2}\s*月\s*/u, "")
    .trim();
  return suffix || stripRichText(value).trim();
}

function formatMonthTitle(year: number, month: number, suffixValue: unknown, uiText: any) {
  const suffix = cleanMonthTitleSuffix(suffixValue);
  const shouldUseChineseDate = /[\u4e00-\u9fff]/u.test(`${uiText.ganttTitle || ""}${uiText.prevMonth || ""}${uiText.nextMonth || ""}${suffix}`);
  const dateLabel = shouldUseChineseDate ? `${year}年${month}月` : `${year} / ${month}`;
  return suffix ? `${dateLabel} ${suffix}` : dateLabel;
}

export function Gantt({ events, selected, setSelected, month, setMonth, query, setQuery, t, lang, setLang, languages, uiText, eventNotes, setEventNotes }: any) {
  const days = getDaysInMonth(month);
  const year = month.getFullYear();
  const currentMonth = month.getMonth();
  const monthNumber = currentMonth + 1;
  const monthTitle = formatMonthTitle(year, monthNumber, uiText.monthTitleSuffix, uiText);
  const dayWidth = 44;
  const labelWidth = 260;
  const chartWidth = days * dayWidth;
  const range = monthRange(month);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((event: any) => intersectsMonth(event, month))
      .filter((event: any) => !q || `${event.eventId} ${t(event.title)} ${t(event.desc)}`.toLowerCase().includes(q));
  }, [events, month, query, t]);

  const rows = useMemo(() => {
    const map = new Map<string, { title: string; events: any[]; types: Set<string> }>();
    for (const event of visible) {
      const key = t(event.title);
      if (!map.has(key)) map.set(key, { title: t(event.title), events: [], types: new Set() });
      const group = map.get(key)!;
      group.events.push(event);
      event.types.forEach((type: string) => group.types.add(type));
    }
    return Array.from(map.values()).map((row) => {
      const sortedEvents = [...row.events].sort((a, b) => (normalizeDate(a.start)?.getTime() ?? 0) - (normalizeDate(b.start)?.getTime() ?? 0));
      const idsKey = sortedEvents.map((event) => event.eventId).join("|");
      return {
        title: row.title,
        events: sortedEvents,
        idsKey,
        defaultDescription: sortedEvents.map((event) => `#${event.eventId}`).join(" / "),
        types: Array.from(row.types),
      };
    });
  }, [visible, t]);

  const getBar = (event: any, laneIndex: number) => {
    const rawStart = normalizeDate(event.start) || range.start;
    const rawEnd = normalizeDate(event.end) || range.end;
    const start = rawStart < range.start ? range.start : rawStart;
    const end = rawEnd > range.end ? range.end : rawEnd;
    const left = Math.floor((start.getTime() - range.start.getTime()) / DAY_MS) * dayWidth;
    const width = Math.max(36, (Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1) * dayWidth - 8);
    return { left: left + 4, top: 16 + laneIndex * 44, width };
  };

  return (
    <Surface className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <IconBox className="bg-blue-600">📊</IconBox>
          <div>
            <div className="text-xl font-bold tracking-tight text-slate-950">{uiText.ganttTitle}</div>
            <div className="mt-1 text-xs text-slate-500">{uiText.ganttDesc}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-xl border bg-white">
            {languages.map((language: string) => (
              <button
                key={language}
                type="button"
                onClick={() => {
                  setLang(language);
                  localStorage.setItem(CACHE_KEYS.activeLang, language);
                }}
                className={lang === language ? "bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-sm" : "px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"}
              >
                {language}
              </button>
            ))}
          </div>
          <input
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            placeholder={uiText.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="mx-5 mt-4 mb-4 flex items-center justify-between rounded-3xl bg-slate-100/80 p-2 ring-1 ring-slate-200/70">
        <button type="button" className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" onClick={() => setMonth(new Date(year, currentMonth - 1, 1))}>
          {uiText.prevMonth}
        </button>
        <div className="text-center">
          <div className="font-bold">{monthTitle}</div>
          <div className="text-xs text-slate-500">{uiText.monthCountPrefix} {visible.length} / {uiText.monthCountTotal} {events.length}</div>
        </div>
        <button type="button" className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" onClick={() => setMonth(new Date(year, currentMonth + 1, 1))}>
          {uiText.nextMonth}
        </button>
      </div>

      <div className="mx-5 mb-5 overflow-auto rounded-3xl border border-slate-200 bg-white shadow-inner shadow-slate-100">
        <div style={{ minWidth: labelWidth + chartWidth }}>
          <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-slate-50/95 text-xs text-slate-500 backdrop-blur">
            <div className="shrink-0 border-r p-3 font-semibold" style={{ width: labelWidth }}>{uiText.currentMonthList}</div>
            <div className="flex" style={{ width: chartWidth }}>
              {Array.from({ length: days }, (_, index) => index + 1).map((day) => (
                <div key={day} className="shrink-0 border-r p-2 text-center" style={{ width: dayWidth }}>
                  <div>{day}</div>
                  <div className="text-[10px] text-slate-400">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(year, currentMonth, day).getDay()]}</div>
                </div>
              ))}
            </div>
          </div>

          {rows.length === 0 && <div className="p-8 text-center text-sm text-slate-500">{uiText.emptyMonth}</div>}

          {rows.map((row) => {
            const rowHeight = Math.max(100, 32 + row.events.length * 44);
            const active = row.events.some((event: any) => event.eventId === (selected && selected.eventId));
            return (
              <div key={row.title} className={`flex border-b border-slate-100 last:border-b-0 transition ${active ? "bg-blue-50/80" : "bg-white hover:bg-slate-50/60"}`}>
                <div className="shrink-0 border-r p-3" style={{ width: labelWidth, minHeight: rowHeight }}>
                  <div className="truncate font-semibold text-slate-900" title={stripRichText(row.title)}>{stripRichText(row.title)}</div>
                  <input
                    value={eventNotes[row.idsKey] !== undefined ? eventNotes[row.idsKey] : row.defaultDescription}
                    onChange={(event) => {
                      const next = { ...eventNotes, [row.idsKey]: event.target.value };
                      if (!text(event.target.value) || event.target.value === row.defaultDescription) delete next[row.idsKey];
                      setEventNotes(next);
                      safeWriteStorage(CACHE_KEYS.eventNotes, next);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    title={eventNotes[row.idsKey] || row.defaultDescription}
                    className="mt-1 w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-500 outline-none transition hover:border-slate-200 hover:bg-white focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    placeholder={row.defaultDescription}
                  />
                  {row.events[0] && row.events[0].desc && (
                    <div className="mt-1 truncate text-xs text-slate-400" title={stripRichText(t(row.events[0].desc))}>{stripRichText(t(row.events[0].desc))}</div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">{row.types.map((type: string) => <TypePill key={type} type={type} />)}</div>
                </div>
                <div className="relative" style={{ width: chartWidth, minHeight: rowHeight }}>
                  {Array.from({ length: days }, (_, index) => (
                    <div key={index} className="absolute top-0 h-full border-r border-slate-100" style={{ left: index * dayWidth, width: dayWidth }} />
                  ))}
                  {row.events.map((event: any, index: number) => {
                    const bar = getBar(event, index);
                    const selectedBar = selected && selected.eventId === event.eventId;
                    return (
                      <button
                        key={event.eventId}
                        type="button"
                        onClick={() => setSelected(event)}
                        className={`absolute h-9 rounded-2xl border px-3 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selectedBar ? "border-blue-600 bg-blue-600 text-white" : "border-blue-200 bg-blue-100/90 text-blue-800"}`}
                        style={{ left: bar.left, top: bar.top, width: bar.width }}
                        title={`${stripRichText(t(event.title))} | ${event.eventId}`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-semibold">{stripRichText(t(event.title))}</span>
                          <span className={`shrink-0 rounded-full px-1.5 text-[10px] ${selectedBar ? "bg-blue-500 text-white" : "bg-white text-blue-700"}`}>#{event.eventId}</span>
                        </div>
                        <div className={`truncate text-[10px] ${selectedBar ? "text-blue-100" : "text-blue-600"}`}>{event.start.slice(5, 10)} ~ {event.end.slice(5, 10)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Surface>
  );
}
