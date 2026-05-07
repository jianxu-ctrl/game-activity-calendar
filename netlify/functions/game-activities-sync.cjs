const {
  assertAdminToken,
  fetchDefaultCsv,
  fullSyncFromCsv,
  jsonResponse,
} = require('./_activity-store.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const auth = assertAdminToken(
    event.headers['x-admin-sync-token'] ||
      event.headers['X-Admin-Sync-Token'],
  );
  if (!auth.ok) {
    return jsonResponse(403, { error: auth.message });
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const csvData = body.csvData || (await fetchDefaultCsv());
    const result = await fullSyncFromCsv(event, csvData);

    return jsonResponse(result.success ? 200 : 400, result);
  } catch (error) {
    return jsonResponse(500, {
      success: false,
      addedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      failedCount: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    });
  }
};
