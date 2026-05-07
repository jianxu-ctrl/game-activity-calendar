import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { eq, and, gte, lt } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { gameActivity } from '@server/database/schema';
import { LocalGameActivityStore } from './local-game-activity.store';
import type {
  GameActivityListResponse,
  GameActivityListParams,
  GameActivity,
} from '@shared/api.interface';

@Injectable()
export class GameActivityService {
  private readonly logger = new Logger(GameActivityService.name);

  constructor(
    private readonly localStore: LocalGameActivityStore,
    @Optional()
    @Inject(DRIZZLE_DATABASE)
    private readonly db?: PostgresJsDatabase,
  ) {}

  async getGameActivities(
    params: GameActivityListParams,
  ): Promise<GameActivityListResponse> {
    if (this.shouldUseLocalStore()) {
      return this.localStore.getGameActivities(params);
    }

    try {
      return await this.getGameActivitiesFromDatabase(params);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn(
          '数据库读取失败，已切换到本地活动数据文件: ' + String(error),
        );
        return this.localStore.getGameActivities(params);
      }
      throw error;
    }
  }

  private async getGameActivitiesFromDatabase(
    params: GameActivityListParams,
  ): Promise<GameActivityListResponse> {
    const db = this.getDatabase();
    const { region, language, year, month } = params;

    let conditions = [];

    if (region) {
      conditions.push(eq(gameActivity.region, region));
    }

    if (language) {
      conditions.push(eq(gameActivity.language, language));
    }

    if (year !== undefined && month !== undefined) {
      const startOfMonth = new Date(year, month - 1, 1);
      const startOfNextMonth = new Date(year, month, 1);

      conditions.push(
        and(
          gte(gameActivity.endDatetime, startOfMonth),
          lt(gameActivity.startDatetime, startOfNextMonth),
        ),
      );
    }

    const query =
      conditions.length > 0
        ? db
            .select()
            .from(gameActivity)
            .where(and(...conditions))
            .orderBy(gameActivity.startDatetime)
        : db
            .select()
            .from(gameActivity)
            .orderBy(gameActivity.startDatetime);

    const results = await query;

    const items: GameActivity[] = results.map((item) => ({
      id: item.id,
      activityId: item.activityId || undefined,
      region: item.region,
      language: item.language,
      startDatetime: item.startDatetime.toISOString(),
      endDatetime: item.endDatetime.toISOString(),
      imageUrl: item.imageUrl,
      syncStatus: item.syncStatus as 'success' | 'failed',
      syncError: item.syncError || undefined,
    }));

    return {
      items,
      total: items.length,
    };
  }

  async saveGameActivities(
    activities: Array<{
      activityId?: string;
      region: string;
      language: string;
      startDatetime: string;
    endDatetime: string;
      imageUrl: string;
    }>,
    fullSync: boolean = true,
  ): Promise<{ added: number; updated: number; deleted: number; failed: number }> {
    if (this.shouldUseLocalStore()) {
      return this.localStore.saveGameActivities(activities, fullSync);
    }

    try {
      return await this.saveGameActivitiesToDatabase(activities, fullSync);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn(
          '数据库写入失败，已切换到本地活动数据文件: ' + String(error),
        );
        return this.localStore.saveGameActivities(activities, fullSync);
      }
      throw error;
    }
  }

  private async saveGameActivitiesToDatabase(
    activities: Array<{
      activityId?: string;
      region: string;
      language: string;
      startDatetime: string;
      endDatetime: string;
      imageUrl: string;
    }>,
    fullSync: boolean = true,
  ): Promise<{ added: number; updated: number; deleted: number; failed: number }> {
    const db = this.getDatabase();
    let added = 0;
    let updated = 0;
    let deleted = 0;
    let failed = 0;

    try {
      // 全量同步：先清空所有数据
      if (fullSync) {
        const deleteResult = await db.delete(gameActivity);
        deleted = deleteResult.length;
        this.logger.log(`全量同步：已清空 ${deleted} 条旧记录`);
      }

      // 批量插入新数据
      for (const activity of activities) {
        try {
          if (fullSync) {
            // 全量模式直接插入
            await db.insert(gameActivity).values({
              activityId: activity.activityId,
              region: activity.region,
              language: activity.language,
              startDatetime: new Date(activity.startDatetime),
              endDatetime: new Date(activity.endDatetime),
              imageUrl: activity.imageUrl,
              syncStatus: 'success',
            });
            added++;
          } else {
            // 增量模式：检查是否存在
            const existing = await db
              .select()
              .from(gameActivity)
              .where(
                and(
                  eq(gameActivity.region, activity.region),
                  eq(gameActivity.language, activity.language),
                  eq(gameActivity.imageUrl, activity.imageUrl),
                ),
              )
              .limit(1);

            if (existing.length > 0) {
              await db
                .update(gameActivity)
                .set({
                  activityId: activity.activityId || existing[0].activityId,
                  startDatetime: new Date(activity.startDatetime),
                  endDatetime: new Date(activity.endDatetime),
                  syncStatus: 'success',
                  syncError: null,
                })
                .where(eq(gameActivity.id, existing[0].id));
              updated++;
            } else {
              await db.insert(gameActivity).values({
                activityId: activity.activityId,
                region: activity.region,
                language: activity.language,
                startDatetime: new Date(activity.startDatetime),
                endDatetime: new Date(activity.endDatetime),
                imageUrl: activity.imageUrl,
                syncStatus: 'success',
              });
              added++;
            }
          }
        } catch (error) {
          this.logger.error(`保存活动失败: ${JSON.stringify(activity)}`, error);
          failed++;
        }
      }
    } catch (error) {
      this.logger.error('批量保存活动失败', error);
      throw error;
    }

    return { added, updated, deleted, failed };
  }

  private shouldUseLocalStore(): boolean {
    return (
      process.env.FORCE_LOCAL_ACTIVITY_STORE === 'true' ||
      !process.env.SUDA_DATABASE_URL?.trim() ||
      !this.db
    );
  }

  private getDatabase(): PostgresJsDatabase {
    if (!this.db) {
      throw new Error('数据库连接未配置');
    }

    return this.db;
  }
}
