import {
  filterActivities,
  jsonResponse,
  loadActivities,
} from '../../cloudflare/activity-store.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  try {
    const url = new URL(context.request.url);
    const activities = await loadActivities(context.env);
    const items = filterActivities(activities, {
      region: url.searchParams.get('region') || undefined,
      language: url.searchParams.get('language') || undefined,
      year: url.searchParams.get('year')
        ? Number(url.searchParams.get('year'))
        : undefined,
      month: url.searchParams.get('month')
        ? Number(url.searchParams.get('month'))
        : undefined,
    });

    return jsonResponse(200, {
      items,
      total: items.length,
    });
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
