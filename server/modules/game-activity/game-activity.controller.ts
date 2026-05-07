import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { GameActivityService } from './game-activity.service';
import { GameActivityAutomationService } from './game-activity.automation';
import type {
  GameActivityListParams,
  GameActivityListResponse,
  GoogleSheetSyncResult,
} from '@shared/api.interface';

@Controller('api/game-activities')
export class GameActivityController {
  private readonly logger = new Logger(GameActivityController.name);

  constructor(
    private readonly gameActivityService: GameActivityService,
    private readonly automationService: GameActivityAutomationService,
  ) {}

  @Get()
  async getGameActivities(
    @Query('region') region?: string,
    @Query('language') language?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ): Promise<GameActivityListResponse> {
    const params: GameActivityListParams = {
      region,
      language,
      year: year ? parseInt(year, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined,
    };

    this.logger.log(`Get game activities: ${JSON.stringify(params)}`);

    return this.gameActivityService.getGameActivities(params);
  }

  @Post('sync')
  async syncFromGoogleSheets(
    @Body('csvData') csvData?: string,
    @Headers('x-admin-sync-token') adminToken?: string,
  ): Promise<GoogleSheetSyncResult> {
    this.assertSyncAuthorized(adminToken);
    this.logger.log('Manual game activity sync requested');

    if (csvData) {
      return this.automationService.syncFromCsvData(csvData);
    }

    return this.automationService.performSync();
  }

  private assertSyncAuthorized(providedToken?: string) {
    const configuredToken = process.env.ADMIN_SYNC_TOKEN?.trim();

    if (!configuredToken) {
      if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenException(
          'ADMIN_SYNC_TOKEN must be configured before enabling sync.',
        );
      }

      this.logger.warn(
        'ADMIN_SYNC_TOKEN is not configured; sync is allowed in development.',
      );
      return;
    }

    if (!this.secureCompare(providedToken ?? '', configuredToken)) {
      throw new ForbiddenException('Invalid admin sync token.');
    }
  }

  private secureCompare(providedToken: string, configuredToken: string) {
    const provided = Buffer.from(providedToken);
    const configured = Buffer.from(configuredToken);

    return (
      provided.length === configured.length &&
      timingSafeEqual(provided, configured)
    );
  }
}
