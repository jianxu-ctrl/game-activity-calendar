import { logger } from '@lark-apaas/client-toolkit/logger';
import type { GameActivityListResponse, GameActivityListParams, GoogleSheetSyncResult } from '@shared/api.interface';

function normalizeGameActivityListResponse(payload: unknown): GameActivityListResponse {
  const response = payload as {
    items?: unknown;
    total?: unknown;
    data?: { items?: unknown; total?: unknown };
    result?: { items?: unknown; total?: unknown };
  };
  const candidate = Array.isArray(response?.items)
    ? response
    : Array.isArray(response?.data?.items)
      ? response.data
      : Array.isArray(response?.result?.items)
        ? response.result
        : undefined;

  if (!candidate) {
    logger.warn('Unexpected game activities response shape', payload);
    return { items: [], total: 0 };
  }

  return {
    items: candidate.items as GameActivityListResponse['items'],
    total:
      typeof candidate.total === 'number'
        ? candidate.total
        : (candidate.items as GameActivityListResponse['items']).length,
  };
}

export async function getGameActivities(params?: GameActivityListParams): Promise<GameActivityListResponse> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.region) searchParams.append('region', params.region);
    if (params?.language) searchParams.append('language', params.language);
    if (params?.year) searchParams.append('year', params.year.toString());
    if (params?.month) searchParams.append('month', params.month.toString());

    const response = await requestBackend(
      `/api/game-activities?${searchParams.toString()}`,
    );
    const payload = await response.json();

    return normalizeGameActivityListResponse(payload);
  } catch (error) {
    logger.error('获取游戏活动列表失败', error);
    throw error;
  }
}

export async function syncGameActivitiesFromGoogleSheets(
  csvData: string,
  adminToken: string,
): Promise<GoogleSheetSyncResult> {
  try {
    const response = await requestBackend('/api/game-activities/sync', {
      method: 'POST',
      headers: {
        'X-Admin-Sync-Token': adminToken,
      },
      body: JSON.stringify({ csvData }),
    });

    return response.json();
  } catch (error) {
    logger.error('同步谷歌表格数据失败', error);
    throw error;
  }
}

async function requestBackend(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (window.csrfToken && !headers.has('X-Suda-Csrf-Token')) {
    headers.set('X-Suda-Csrf-Token', window.csrfToken);
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const message = await response.text();
    const error = new Error(message || response.statusText) as Error & {
      response?: { status: number };
    };
    error.response = { status: response.status };
    throw error;
  }

  return response;
}
