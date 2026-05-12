import {
  assertAdminToken,
  fetchDefaultCsv,
  fullSyncFromCsv,
  jsonResponse,
} from '../../../cloudflare/activity-store.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const auth = assertAdminToken(
    context.env,
    context.request.headers.get('x-admin-sync-token'),
  );
  if (!auth.ok) {
    return jsonResponse(403, { error: auth.message });
  }

  try {
    const body = await context.request.json().catch(() => ({}));
    const csvData = body.csvData || (await fetchDefaultCsv(context.env));
    const result = await fullSyncFromCsv(context.env, csvData);

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
}
