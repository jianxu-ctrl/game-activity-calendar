const {
  filterActivities,
  jsonResponse,
  loadActivities,
} = require('./_activity-store.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  try {
    const params = event.queryStringParameters || {};
    const activities = await loadActivities(event);
    const items = filterActivities(activities, {
      region: params.region,
      language: params.language,
      year: params.year ? Number(params.year) : undefined,
      month: params.month ? Number(params.month) : undefined,
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
};
