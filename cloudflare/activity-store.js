const ACTIVITIES_KEY = 'activities.json';
const DEFAULT_GOOGLE_SHEETS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1TGdrSpGIjK7AElPam4q6A5YBIS0K8via1a8tQuSMjFM/export?format=csv&gid=0';

const seedActivities = [
  {
    activityId: 'GG-2026-0508',
    region: 'ID',
    language: 'en',
    startDatetime: '2026-05-08 10:00:00',
    endDatetime: '2026-05-12 23:59:59',
    imageUrl: '/sample-events/treasure-rush.svg',
  },
  {
    activityId: 'GG-2026-0516',
    region: 'ID',
    language: 'en',
    startDatetime: '2026-05-16 10:00:00',
    endDatetime: '2026-05-20 23:59:59',
    imageUrl: '/sample-events/arena-clash.svg',
  },
  {
    activityId: 'GG-2026-0524',
    region: 'ID',
    language: 'en',
    startDatetime: '2026-05-24 10:00:00',
    endDatetime: '2026-05-30 23:59:59',
    imageUrl: '/sample-events/guild-festival.svg',
  },
  {
    activityId: 'GG-2026-CN-0510',
    region: 'CN',
    language: 'zh-CN',
    startDatetime: '2026-05-10 10:00:00',
    endDatetime: '2026-05-18 23:59:59',
    imageUrl: '/sample-events/glory-season.svg',
  },
  {
    activityId: 'GG-2026-JP-0521',
    region: 'JP',
    language: 'ja',
    startDatetime: '2026-05-21 10:00:00',
    endDatetime: '2026-05-26 23:59:59',
    imageUrl: '/sample-events/hero-trials.svg',
  },
];

export async function loadActivities(env) {
  const store = getActivityStore(env);
  const stored = await store.get(ACTIVITIES_KEY, { type: 'json' });
  const activities = Array.isArray(stored)
    ? stored
    : Array.isArray(stored?.data)
      ? stored.data
      : null;

  if (activities) {
    return activities.map(toGameActivity);
  }

  const seeded = seedActivities.map(toGameActivity);
  await saveActivities(env, seeded);
  return seeded;
}

export async function saveActivities(env, activities) {
  const store = getActivityStore(env);
  const normalized = activities.map(toGameActivity);
  await store.put(ACTIVITIES_KEY, JSON.stringify(normalized));
  return normalized;
}

export function filterActivities(activities, params) {
  const { region, language, year, month } = params;

  return activities
    .filter((activity) => {
      if (region && activity.region !== region) return false;
      if (language && activity.language !== language) return false;

      if (year && month) {
        const startOfMonth = new Date(Number(year), Number(month) - 1, 1);
        const startOfNextMonth = new Date(Number(year), Number(month), 1);
        const start = new Date(activity.startDatetime);
        const end = new Date(activity.endDatetime);

        return end >= startOfMonth && start < startOfNextMonth;
      }

      return true;
    })
    .sort(
      (a, b) =>
        new Date(a.startDatetime).getTime() -
        new Date(b.startDatetime).getTime(),
    );
}

export async function fullSyncFromCsv(env, csvData) {
  const current = await loadActivities(env);
  const activities = parseActivitiesFromCsv(csvData);

  if (activities.length === 0) {
    return {
      success: false,
      addedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      failedCount: 0,
      errors: ['No activities were parsed from the uploaded file.'],
    };
  }

  const saved = await saveActivities(env, activities);

  return {
    success: true,
    addedCount: saved.length,
    updatedCount: 0,
    deletedCount: current.length,
    failedCount: 0,
    errors: [],
  };
}

export async function fetchDefaultCsv(env) {
  const url = env.GOOGLE_SHEETS_CSV_URL || DEFAULT_GOOGLE_SHEETS_CSV_URL;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Sheets CSV: ${response.status}`);
  }

  return response.text();
}

export function assertAdminToken(env, providedToken) {
  const configuredToken = String(env.ADMIN_SYNC_TOKEN || '').trim();

  if (!configuredToken) {
    return {
      ok: false,
      message: 'ADMIN_SYNC_TOKEN is not configured.',
    };
  }

  const ok = safeTokenEquals(String(providedToken || ''), configuredToken);

  return {
    ok,
    message: ok ? '' : 'Invalid admin sync token.',
  };
}

export function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function getActivityStore(env) {
  if (!env.GAME_ACTIVITY_CALENDAR) {
    throw new Error('KV binding GAME_ACTIVITY_CALENDAR is not configured.');
  }

  return env.GAME_ACTIVITY_CALENDAR;
}

function parseActivitiesFromCsv(csvContent) {
  const activities = [];
  const lines = String(csvContent || '')
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length === 0) {
    return activities;
  }

  const headers = parseCsvLine(lines[0].trim().toLowerCase());
  const columnMap = {};

  headers.forEach((header, index) => {
    const h = header.trim().toLowerCase();
    const hNoSpace = h.replace(/[_\s-]/g, '');

    if (h === 'id' || hNoSpace === 'activityid') columnMap.activityId = index;
    if (h.includes('region') || h.includes('\u5730\u533a') || h.includes('\u533a\u57df')) {
      columnMap.region = index;
    }
    if (h.includes('language') || h.includes('\u8bed\u8a00') || h.includes('lang')) {
      columnMap.language = index;
    }
    if (
      (h.includes('start') && (h.includes('date') || h.includes('time'))) ||
      h.includes('\u5f00\u59cb')
    ) {
      columnMap.startDatetime = index;
    }
    if (
      (h.includes('end') && (h.includes('date') || h.includes('time'))) ||
      h.includes('\u7ed3\u675f')
    ) {
      columnMap.endDatetime = index;
    }
    if (
      (h.includes('image') && h.includes('url')) ||
      h.includes('\u56fe\u7247') ||
      hNoSpace === 'imageurl'
    ) {
      columnMap.imageUrl = index;
    }
  });

  const hasRequiredColumns =
    columnMap.region !== undefined &&
    columnMap.language !== undefined &&
    columnMap.imageUrl !== undefined;
  const startLine = hasRequiredColumns ? 1 : 0;

  if (!hasRequiredColumns) {
    columnMap.region = 0;
    columnMap.language = 1;
    columnMap.startDatetime = 2;
    columnMap.endDatetime = 3;
    columnMap.imageUrl = 4;
  }

  for (let i = startLine; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i].trim());
    const region = parts[columnMap.region]?.trim();
    const language = parts[columnMap.language]?.trim();
    const imageUrl = parts[columnMap.imageUrl]?.trim();

    if (!region || !language || !imageUrl) {
      continue;
    }

    activities.push({
      activityId: parts[columnMap.activityId]?.trim() || undefined,
      region,
      language,
      startDatetime: formatDateTime(parts[columnMap.startDatetime]?.trim()),
      endDatetime: formatDateTime(parts[columnMap.endDatetime]?.trim()),
      imageUrl,
    });
  }

  return activities;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function formatDateTime(value = '') {
  const cleaned = value.trim();

  if (!cleaned) return '';
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(cleaned)) return cleaned;
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return `${cleaned} 00:00:00`;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(cleaned)) {
    return `${cleaned.replace(/\//g, '-')} 00:00:00`;
  }

  const date = new Date(cleaned);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  return cleaned;
}

function toGameActivity(activity) {
  return {
    id: activity.id || crypto.randomUUID(),
    activityId: activity.activityId || undefined,
    region: activity.region,
    language: activity.language,
    startDatetime: toIsoDate(activity.startDatetime),
    endDatetime: toIsoDate(activity.endDatetime),
    imageUrl: activity.imageUrl,
    syncStatus: activity.syncStatus || 'success',
    syncError: activity.syncError || undefined,
  };
}

function toIsoDate(value) {
  if (!value) return '';

  const date = new Date(String(value).replace(' ', 'T'));
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString();
  }

  return String(value);
}

function safeTokenEquals(left, right) {
  if (left.length !== right.length) return false;

  let result = 0;
  for (let i = 0; i < left.length; i++) {
    result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }

  return result === 0;
}
