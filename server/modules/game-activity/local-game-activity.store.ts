import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';

import type {
  GameActivity,
  GameActivityListParams,
  GameActivityListResponse,
} from '@shared/api.interface';

type ActivityInput = {
  activityId?: string;
  region: string;
  language: string;
  startDatetime: string;
  endDatetime: string;
  imageUrl: string;
};

type SaveResult = {
  added: number;
  updated: number;
  deleted: number;
  failed: number;
};

@Injectable()
export class LocalGameActivityStore {
  private readonly logger = new Logger(LocalGameActivityStore.name);
  private readonly filePath = resolve(
    process.cwd(),
    process.env.LOCAL_ACTIVITY_STORE_PATH || 'data/game-activities.json',
  );
  private activitiesCache: GameActivity[] | null = null;

  async getGameActivities(
    params: GameActivityListParams,
  ): Promise<GameActivityListResponse> {
    const activities = await this.loadActivities();
    const items = activities
      .filter((activity) => this.matchesFilters(activity, params))
      .sort(
        (a, b) =>
          new Date(a.startDatetime).getTime() -
          new Date(b.startDatetime).getTime(),
      );

    return {
      items,
      total: items.length,
    };
  }

  async saveGameActivities(
    activities: ActivityInput[],
    fullSync = true,
  ): Promise<SaveResult> {
    const current = await this.loadActivities();
    const next = fullSync ? [] : [...current];
    const result: SaveResult = {
      added: 0,
      updated: 0,
      deleted: fullSync ? current.length : 0,
      failed: 0,
    };

    for (const activity of activities) {
      try {
        const normalized = this.toGameActivity(activity);

        if (fullSync) {
          next.push(normalized);
          result.added++;
          continue;
        }

        const existingIndex = next.findIndex(
          (item) =>
            item.region === normalized.region &&
            item.language === normalized.language &&
            item.imageUrl === normalized.imageUrl,
        );

        if (existingIndex >= 0) {
          next[existingIndex] = {
            ...normalized,
            id: next[existingIndex].id,
          };
          result.updated++;
        } else {
          next.push(normalized);
          result.added++;
        }
      } catch (error) {
        this.logger.error(
          `保存本地活动失败: ${JSON.stringify(activity)}`,
          error,
        );
        result.failed++;
      }
    }

    await this.writeActivities(next);
    return result;
  }

  private async loadActivities(): Promise<GameActivity[]> {
    if (this.activitiesCache) {
      return this.activitiesCache;
    }

    try {
      const content = await readFile(this.filePath, 'utf8');
      this.activitiesCache = JSON.parse(content) as GameActivity[];
      return this.activitiesCache;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        throw error;
      }

      const seeded = await this.loadSeedActivities();
      await this.writeActivities(seeded);
      this.logger.log(`已创建本地活动数据文件: ${this.filePath}`);
      return seeded;
    }
  }

  private async loadSeedActivities(): Promise<GameActivity[]> {
    const seedPathCandidates = [
      process.env.DEFAULT_ACTIVITY_SEED_PATH,
      join(process.cwd(), 'server/modules/game-activity/default-game-activities.json'),
      join(__dirname, 'default-game-activities.json'),
    ].filter(Boolean) as string[];

    for (const seedPath of seedPathCandidates) {
      try {
        const content = await readFile(seedPath, 'utf8');
        return (JSON.parse(content) as ActivityInput[]).map((activity) =>
          this.toGameActivity(activity),
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }

    return [];
  }

  private async writeActivities(activities: GameActivity[]): Promise<void> {
    this.activitiesCache = activities;
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(
      this.filePath,
      JSON.stringify(activities, null, 2) + '\n',
      'utf8',
    );
  }

  private matchesFilters(
    activity: GameActivity,
    params: GameActivityListParams,
  ): boolean {
    if (params.region && activity.region !== params.region) {
      return false;
    }

    if (params.language && activity.language !== params.language) {
      return false;
    }

    if (params.year !== undefined && params.month !== undefined) {
      const startOfMonth = new Date(params.year, params.month - 1, 1);
      const startOfNextMonth = new Date(params.year, params.month, 1);
      const start = new Date(activity.startDatetime);
      const end = new Date(activity.endDatetime);

      return end >= startOfMonth && start < startOfNextMonth;
    }

    return true;
  }

  private toGameActivity(activity: ActivityInput): GameActivity {
    return {
      id: randomUUID(),
      activityId: activity.activityId,
      region: activity.region,
      language: activity.language,
      startDatetime: this.toIsoDateTime(activity.startDatetime),
      endDatetime: this.toIsoDateTime(activity.endDatetime),
      imageUrl: activity.imageUrl,
      syncStatus: 'success',
    };
  }

  private toIsoDateTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }
}
