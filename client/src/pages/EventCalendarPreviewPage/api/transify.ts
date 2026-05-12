export type TransifyLanguageResult = {
  language: string;
  languageId?: string;
  resourceId?: string;
  requestedKeyCount?: number;
  count: number;
  translations: Record<string, string>;
  error?: string;
};

export type TransifyImportResponse = {
  success: boolean;
  requestedKeyCount: number;
  importedKeyCount: number;
  languages: Record<string, TransifyLanguageResult>;
  errors?: string[];
};

export async function importTransifyTranslations(options: {
  adminToken: string;
  languages: string[];
  keys: string[];
}) {
  const response = await fetch("/api/transify/translations", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-Admin-Sync-Token": options.adminToken,
    },
    body: JSON.stringify({
      languages: options.languages,
      keys: options.keys,
    }),
  });

  const responseText = await response.text();
  let payload: TransifyImportResponse;
  try {
    payload = JSON.parse(responseText) as TransifyImportResponse;
  } catch {
    payload = {
      success: false,
      requestedKeyCount: 0,
      importedKeyCount: 0,
      languages: {},
      errors: [responseText || response.statusText],
    };
  }

  if (!response.ok) {
    const message = payload.errors?.join("; ") || response.statusText;
    throw new Error(message);
  }

  return payload;
}
