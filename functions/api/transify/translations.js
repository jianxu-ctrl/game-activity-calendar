import {
  assertAdminToken,
  jsonResponse,
} from '../../../cloudflare/activity-store.js';
import { fetchTransifyTranslations } from '../../../cloudflare/transify-client.js';

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
    const keys = Array.isArray(body.keys) ? body.keys : [];
    const languages = normalizeLanguages(body.languages || body.language);

    if (!languages.length) {
      return jsonResponse(400, { success: false, errors: ['No language was provided.'] });
    }

    const results = await Promise.allSettled(
      languages.map((language) => fetchTransifyTranslations(context.env, { language, keys })),
    );
    const translations = {};
    const errors = [];

    results.forEach((result, index) => {
      const language = languages[index];
      if (result.status === 'fulfilled') {
        translations[language] = result.value;
      } else {
        translations[language] = {
          language,
          count: 0,
          translations: {},
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        };
        errors.push(`${language}: ${translations[language].error}`);
      }
    });

    const importedKeyCount = Object.values(translations).reduce(
      (sum, item) => sum + Number(item.count || 0),
      0,
    );

    return jsonResponse(errors.length ? 207 : 200, {
      success: errors.length === 0,
      requestedKeyCount: keys.length,
      importedKeyCount,
      languages: translations,
      errors,
    });
  } catch (error) {
    return jsonResponse(500, {
      success: false,
      errors: [error instanceof Error ? error.message : String(error)],
    });
  }
}

function normalizeLanguages(value) {
  const list = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      list
        .map((language) => String(language || '').trim().toUpperCase())
        .filter(Boolean),
    ),
  );
}
