const DEFAULT_TRANSIFY_BASE_URL = 'https://transify.garena.com';
const DEFAULT_TRANSIFY_RESOURCE_ID = '4115';
const DEFAULT_TRANSIFY_HANDLER_TYPE = 'json';
const DEFAULT_LANGUAGE_IDS = {
  EN: '1',
  CN: '5',
  ES: '26',
  MY: '12',
  ID: '6',
  TH: '4',
  VI: '3',
};

export async function fetchTransifyTranslations(env, options) {
  const token = String(env.TRANSIFY_AUTH_TOKEN || '').trim();
  if (!token) {
    throw new Error('TRANSIFY_AUTH_TOKEN is not configured.');
  }

  const language = normalizeLanguage(options.language);
  const languageIds = getLanguageIds(env);
  const languageId = languageIds[language];
  if (!languageId) {
    throw new Error(`Transify language id is not configured for ${language}.`);
  }

  const keys = normalizeKeys(options.keys);

  const baseUrl = String(env.TRANSIFY_BASE_URL || DEFAULT_TRANSIFY_BASE_URL).replace(/\/+$/, '');
  const resourceId = String(env.TRANSIFY_RESOURCE_ID || DEFAULT_TRANSIFY_RESOURCE_ID).trim();
  const handlerType = String(env.TRANSIFY_HANDLER_TYPE || DEFAULT_TRANSIFY_HANDLER_TYPE).trim();
  const url = `${baseUrl}/api/resources/${encodeURIComponent(resourceId)}/languagestoken/${encodeURIComponent(languageId)}/export/${encodeURIComponent(handlerType)}`;

  const formBody = buildFormBody({
    file: keys.length ? buildJsonTranslationFile(keys) : '',
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': formBody.contentType,
    },
    body: formBody.body,
  });

  const responseText = await response.text();
  if (!response.ok) {
    const message = responseText.slice(0, 500) || response.statusText;
    throw new Error(`Transify export failed for ${language}: ${response.status} ${message}`);
  }

  const translations = parseTransifyResponse(responseText, language, keys);
  return {
    language,
    languageId,
    resourceId,
    handlerType,
    requestedKeyCount: keys.length,
    count: Object.keys(translations).length,
    translations,
  };
}

export function getLanguageIds(env) {
  return {
    ...DEFAULT_LANGUAGE_IDS,
    ...parseLanguageIds(env.TRANSIFY_LANGUAGE_IDS || env.TRANSIFY_LANGUAGE_IDS_JSON),
  };
}

function buildJsonTranslationFile(keys) {
  const file = {};
  for (const key of keys) file[key] = '';
  return JSON.stringify(file);
}

function buildFormBody(fields) {
  const boundary = `----codex-transify-${randomId()}`;
  let body = '';

  for (const [name, value] of Object.entries(fields)) {
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="${escapeFormName(name)}"\r\n\r\n`;
    body += `${String(value)}\r\n`;
  }

  body += `--${boundary}--\r\n`;

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function randomId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

function escapeFormName(value) {
  return String(value).replace(/"/g, '%22').replace(/\r|\n/g, '');
}

function parseLanguageIds(value) {
  const raw = String(value || '').trim();
  if (!raw) return {};

  if (raw.startsWith('{')) {
    try {
      const data = JSON.parse(raw);
      return Object.fromEntries(
        Object.entries(data || {})
          .map(([language, languageId]) => [normalizeLanguage(language), String(languageId || '').trim()])
          .filter(([, languageId]) => languageId),
      );
    } catch {
      return {};
    }
  }

  return Object.fromEntries(
    raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [language, languageId] = part.split(/[:=]/);
        return [normalizeLanguage(language), String(languageId || '').trim()];
      })
      .filter(([, languageId]) => languageId),
  );
}

function parseTransifyResponse(responseText, language, keys) {
  const payload = parseJsonText(responseText);
  const rawMap = extractTranslationMap(payload, language);
  const requestedKeys = new Set(keys);
  const filtered = {};

  for (const [key, value] of Object.entries(rawMap)) {
    if (requestedKeys.has(key) && value) filtered[key] = value;
  }

  return Object.keys(filtered).length ? filtered : rawMap;
}

function extractTranslationMap(payload, language) {
  const queue = [payload];
  const seen = new Set();

  while (queue.length) {
    const candidate = queue.shift();
    if (!candidate) continue;
    if (typeof candidate === 'string') {
      const parsed = tryParseJson(candidate);
      if (parsed) queue.push(parsed);
      continue;
    }
    if (typeof candidate !== 'object') continue;
    if (seen.has(candidate)) continue;
    seen.add(candidate);

    if (Array.isArray(candidate)) {
      const map = mapFromRows(candidate);
      if (Object.keys(map).length) return map;
      continue;
    }

    const languageMap =
      candidate[language] ||
      candidate[language.toUpperCase()] ||
      candidate[language.toLowerCase()];
    if (languageMap && typeof languageMap === 'object') {
      queue.unshift(languageMap);
    }

    const direct = mapFromObject(candidate, language);
    if (Object.keys(direct).length) return direct;

    for (const key of ['data', 'result', 'translations', 'content', 'file']) {
      if (candidate[key]) queue.push(candidate[key]);
    }
  }

  return {};
}

function mapFromRows(rows) {
  const map = {};
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const key = String(row.key || row.Key || row.KEY || row.id || row.ID || '').trim();
    const value = row.value || row.Value || row.text || row.Text || row.translation || row.Translation;
    if (key && value !== undefined && value !== null) map[key] = String(value).trim();
  }
  return map;
}

function mapFromObject(candidate, language) {
  const map = {};
  for (const [key, value] of Object.entries(candidate)) {
    if (!looksLikeTranslationKey(key)) continue;

    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'object') {
      const nested =
        value[language] ||
        value[language.toUpperCase()] ||
        value[language.toLowerCase()] ||
        value.value ||
        value.Value ||
        value.text ||
        value.Text ||
        value.translation ||
        value.Translation;
      if (nested !== undefined && nested !== null) map[key] = String(nested).trim();
      continue;
    }

    map[key] = String(value).trim();
  }
  return map;
}

function parseJsonText(value) {
  const parsed = tryParseJson(value);
  if (parsed) return parsed;
  throw new Error('Transify did not return JSON. Check TRANSIFY_HANDLER_TYPE or token permissions.');
}

function tryParseJson(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeKeys(keys) {
  return Array.from(
    new Set(
      (Array.isArray(keys) ? keys : [])
        .map((key) => String(key || '').trim())
        .filter(looksLikeTranslationKey),
    ),
  );
}

function normalizeLanguage(value) {
  return String(value || '').trim().toUpperCase();
}

function looksLikeTranslationKey(value) {
  const key = String(value || '').trim().toUpperCase();
  return (
    key.startsWith('TXT_') ||
    key.startsWith('TEXT_') ||
    key.startsWith('ITEM_') ||
    key.startsWith('NAME_') ||
    key.includes('_TITLE') ||
    key.includes('_NAME') ||
    key.includes('_DESC')
  );
}
