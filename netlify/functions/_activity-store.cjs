const { randomUUID, timingSafeEqual } = require('node:crypto');
const seedActivities = require('../../server/modules/game-activity/default-game-activities.json');

const STORE_NAME = 'game-activity-calendar';
const ACTIVITIES_KEY = 'activities.json';
const DEFAULT_GOOGLE_SHEETS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1TGdrSpGIjK7AElPam4q6A5YBIS0K8via1a8tQuSMjFM/export?format=csv&gid=0';

async function getActivityStore(event) {
  const { connectLambda, getStore } = await import('@netlify/blobs');
  connectLambda(event);
  return getStore({
    name: STORE_NAME,
    consistency: 'eventual',
  });
}

async function loadActivities(event) {
  const store = await getActivityStore(event);
  const stored = await store.get(ACTIVITIES_KEY, {
    consistency: 'eventual',
    type: 'json',
  });
  const activities = Array.isArray(stored)
    ? stored
    : Array.isArray(stored?.data)
      ? stored.data
      : null;

  if (activities) {
    return activities.map(toGameActivity);
  }

  const seeded = seedActivities.map(toGameActivity);
  await saveActivities(event, seeded);
  return seeded;
}

async function saveActivities(event, activities) {
  const store = await getActivityStore(event);
  const normalized = activities.map(toGameActivity);

  if (typeof store.setJSON === 'function') {
    await store.setJSON(ACTIVITIES_KEY, normalized);
    return normalized;
  }

  await store.set(ACTIVITIES_KEY, JSON.stringify(normalized));
  return normalized;
}

function filterActivities(activities, params) {
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

async function fullSyncFromCsv(event, csvData) {
  const current = await loadActivities(event);
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

  const saved = await saveActivities(event, activities);

  return {
    success: true,
    addedCount: saved.length,
    updatedCount: 0,
    deletedCount: current.length,
    failedCount: 0,
    errors: [],
  };
}

async function fetchDefaultCsv() {
  const url = process.env.GOOGLE_SHEETS_CSV_URL || DEFAULT_GOOGLE_SHEETS_CSV_URL;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Sheets CSV: ${response.status}`);
  }

  return response.text();
}

function assertAdminToken(providedToken) {
  const configuredToken = process.env.ADMIN_SYNC_TOKEN?.trim();

  if (!configuredToken) {
    return {
      ok: false,
      message: 'ADMIN_SYNC_TOKEN is not configured.',
    };
  }

  const provided = Buffer.from(providedToken || '');
  const configured = Buffer.from(configuredToken);
  const ok =
    provided.length === configured.length &&
    timingSafeEqual(provided, configured);

  return {
    ok,
    message: ok ? '' : 'Invalid admin sync token.',
  };
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
    if (h.includes('region') || h.includes('地区') || h.includes('区域')) {
      columnMap.region = index;
    }
    if (h.includes('language') || h.includes('语言') || h.includes('lang')) {
      columnMap.language = index;
    }
    if (
      (h.includes('start') && (h.includes('date') || h.includes('time'))) ||
      h.includes('开始')
    ) {
      columnMap.startDatetime = index;
    }
    if (
      (h.includes('end') && (h.includes('date') || h.includes('time'))) ||
      h.includes('结束')
    ) {
      columnMap.endDatetime = index;
    }
    if (
      (h.includes('image') && h.includes('url')) ||
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
    id: activity.id || randomUUID(),
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

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

module.exports = {
  assertAdminToken,
  fetchDefaultCsv,
  filterActivities,
  fullSyncFromCsv,
  jsonResponse,
  loadActivities,
};
