import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { GameActivityService } from './game-activity.service';
import { Automation, BindTrigger } from '@lark-apaas/fullstack-nestjs-core';
import type { GoogleSheetSyncResult } from '@shared/api.interface';
import { AxiosError } from 'axios';

const GOOGLE_SHEETS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1TGdrSpGIjK7AElPam4q6A5YBIS0K8via1a8tQuSMjFM/export?format=csv&gid=0';

@Automation()
@Injectable()
export class GameActivityAutomationService {
  private readonly logger = new Logger(GameActivityAutomationService.name);

  constructor(
    private readonly gameActivityService: GameActivityService,
    private readonly httpService: HttpService,
  ) {}

  @BindTrigger('sync_google_sheets_daily')
  async syncFromGoogleSheets(): Promise<void> {
    await this.performSync();
  }

  async performSync(): Promise<GoogleSheetSyncResult> {
    this.logger.log('开始从谷歌表格同步活动数据...');

    const result: GoogleSheetSyncResult = {
      success: true,
      addedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      const csvContent = await this.fetchCsvFromGoogleSheets();
      return this.processCsvContent(csvContent);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('同步谷歌表格数据失败: ' + errorMessage);
      result.success = false;
      result.errors.push(errorMessage);
      return result;
    }
  }

  async syncFromCsvData(csvData: string): Promise<GoogleSheetSyncResult> {
    this.logger.log('开始从CSV数据同步活动...');
    return this.processCsvContent(csvData);
  }

  private async processCsvContent(csvContent: string): Promise<GoogleSheetSyncResult> {
    const result: GoogleSheetSyncResult = {
      success: true,
      addedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      failedCount: 0,
      errors: [],
    };

    if (!csvContent || csvContent.length === 0) {
      this.logger.warn('CSV内容为空');
      result.errors.push('CSV内容为空');
      return result;
    }

    const activities = this.parseActivitiesFromCsv(csvContent);

    this.logger.log('解析出 ' + activities.length + ' 条活动记录');

    if (activities.length === 0) {
      this.logger.warn('未从CSV解析出任何活动数据');
      result.errors.push('未从CSV解析出任何活动数据');
      return result;
    }

    const saveResult = await this.gameActivityService.saveGameActivities(
      activities,
      true, // 全量同步模式
    );

    result.addedCount = saveResult.added;
    result.updatedCount = saveResult.updated;
    result.deletedCount = saveResult.deleted;
    result.failedCount = saveResult.failed;

    this.logger.log(
      '同步完成：新增 ' + saveResult.added + ' 条，更新 ' + saveResult.updated + ' 条，失败 ' + saveResult.failed + ' 条',
    );

    return result;
  }

  private async fetchCsvFromGoogleSheets(): Promise<string> {
    try {
      const response = await this.httpService.axiosRef.get(GOOGLE_SHEETS_CSV_URL, {
        responseType: 'text',
        timeout: 30000,
      });

      if (response.status !== 200) {
        throw new Error('获取谷歌表格失败，状态码: ' + response.status);
      }

      const data = response.data;
      this.logger.log('获取到CSV数据，长度: ' + (data?.length || 0));
      return data;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const errMsg = error.message || '未知错误';
        throw new Error('HTTP请求失败: 状态=' + status + ' ' + statusText + ', 消息=' + errMsg);
      }
      throw error;
    }
  }

  private parseActivitiesFromCsv(
    csvContent: string,
  ): Array<{
    activityId?: string;
    region: string;
    language: string;
    startDatetime: string;
    endDatetime: string;
    imageUrl: string;
  }> {
    const activities: Array<{
      activityId?: string;
      region: string;
      language: string;
      startDatetime: string;
      endDatetime: string;
      imageUrl: string;
    }> = [];

    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length === 0) return activities;

      // 解析表头，确定列索引
      const headerLine = lines[0].trim().toLowerCase();
      const headers = this.parseCsvLine(headerLine);

      const columnMap: Record<string, number> = {};
      headers.forEach((header, index) => {
        const h = header.trim().toLowerCase();
        const hNoSpace = h.replace(/[_\s-]/g, '');
        
        // id 列识别（CSV中的id字段）
        if (h === 'id' || h === 'activityid' || h === 'activity_id') {
          columnMap['activityId'] = index;
        }
        if (h.includes('region') || h.includes('地区') || h.includes('区域')) columnMap['region'] = index;
        if (h.includes('language') || h.includes('语言') || h.includes('lang')) columnMap['language'] = index;
        if ((h.includes('start') && (h.includes('date') || h.includes('time'))) || h.includes('开始')) columnMap['startDatetime'] = index;
        if ((h.includes('end') && (h.includes('date') || h.includes('time'))) || h.includes('结束')) columnMap['endDatetime'] = index;
        
        // image_url 列识别：必须同时包含 image 和 url
        if ((h.includes('image') && h.includes('url')) || h === 'imageurl' || h === 'image_url') {
          columnMap['imageUrl'] = index;
        }
      });

      // 检查是否找到必要的列
      const hasRequiredColumns = columnMap['region'] !== undefined && 
                                  columnMap['language'] !== undefined && 
                                  columnMap['imageUrl'] !== undefined;
      
      let startLine: number;
      if (!hasRequiredColumns) {
        this.logger.warn('未找到必要的列，尝试使用默认顺序解析');
        // 如果找不到表头，假设第一行就是数据
        columnMap['region'] = 0;
        columnMap['language'] = 1;
        columnMap['startDatetime'] = 2;
        columnMap['endDatetime'] = 3;
        columnMap['imageUrl'] = 4;
        startLine = 0;
      } else {
        this.logger.log('列映射: ' + JSON.stringify(columnMap));
        this.logger.log('表头: ' + JSON.stringify(headers));
        startLine = 1;
      }

      for (let i = startLine; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = this.parseCsvLine(line);

        // 调试：打印每行数据
        this.logger.log(`第${i}行 - 解析出${parts.length}个字段`);
        this.logger.log(`  region[${columnMap['region']}]=${parts[columnMap['region']]}`);
        this.logger.log(`  language[${columnMap['language']}]=${parts[columnMap['language']]}`);
        this.logger.log(`  imageUrl[${columnMap['imageUrl']}]=${parts[columnMap['imageUrl']]}`);

        const region = parts[columnMap['region']]?.trim();
        const language = parts[columnMap['language']]?.trim();
        const imageUrl = parts[columnMap['imageUrl']]?.trim();

        if (region && language && imageUrl) {
          activities.push({
            activityId: parts[columnMap['activityId']]?.trim() || undefined,
            region,
            language,
            startDatetime: this.formatDateTime(parts[columnMap['startDatetime']]?.trim() || ''),
            endDatetime: this.formatDateTime(parts[columnMap['endDatetime']]?.trim() || ''),
            imageUrl,
          });
          this.logger.log(`  -> 成功添加活动`);
        } else {
          this.logger.log(`  -> 跳过: region=${!!region}, language=${!!language}, imageUrl=${!!imageUrl}`);
        }
      }

      this.logger.log(`成功解析 ${activities.length} 条活动记录`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('解析CSV内容失败: ' + errorMessage);
    }

    return activities;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  private formatDateTime(dateStr: string): string {
    if (!dateStr) return '';

    const cleaned = dateStr.trim();

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(cleaned)) {
      return cleaned;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return `${cleaned} 00:00:00`;
    }

    if (/^\d{4}\/\d{2}\/\d{2}$/.test(cleaned)) {
      return cleaned.replace(/\//g, '-') + ' 00:00:00';
    }

    try {
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 19).replace('T', ' ');
      }
    } catch {
      // ignore
    }

    return cleaned;
  }
}
