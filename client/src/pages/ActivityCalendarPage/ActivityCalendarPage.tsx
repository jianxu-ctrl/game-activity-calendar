import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Globe, Languages, CalendarDays, ExternalLink, Upload, X } from 'lucide-react';
import { getGameActivities, syncGameActivitiesFromGoogleSheets } from '@/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { GameActivity } from '@shared/api.interface';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ADMIN_SYNC_TOKEN_STORAGE_KEY = 'game-activity-admin-sync-token';
const DAY_MS = 24 * 60 * 60 * 1000;

// 语言显示名称映射
const LANGUAGE_LABELS: Record<string, string> = {
  'zh-CN': '简体中文',
  'en': 'English',
  'en-US': 'English (US)',
  'id': 'Bahasa Indonesia',
  'vi': 'Tiếng Việt',
  'es': 'Español',
  'ja': '日本語',
  'ja-JP': '日本語',
  'ko': '한국어',
  'ko-KR': '한국어',
};

// Region display labels
const REGION_LABELS: Record<string, string> = {
  'CN': 'China (CN)',
  'US': 'United States (US)',
  'ID': 'Indonesia (ID)',
  'SG': 'Singapore (SG)',
  'JP': 'Japan (JP)',
  'KR': 'Korea (KR)',
  'EU': 'Europe (EU)',
};

const ActivityCalendarPage = () => {
  const [activities, setActivities] = useState<GameActivity[]>([]);
  const [allActivities, setAllActivities] = useState<GameActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRegion, setSelectedRegion] = useState('ID');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedActivity, setSelectedActivity] = useState<GameActivity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [adminToken, setAdminToken] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.sessionStorage.getItem(ADMIN_SYNC_TOKEN_STORAGE_KEY) || '';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 悬停预览状态
  const [hoveredActivity, setHoveredActivity] = useState<GameActivity | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const showAdminControls =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('admin') === '1' ||
      Boolean(adminToken));

  useEffect(() => {
    fetchActivities();
  }, [selectedRegion, selectedLanguage, year, month]);

  // 清理悬停 timeout
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      // 获取筛选后的活动
      const data = await getGameActivities({
        region: selectedRegion,
        language: selectedLanguage,
        year,
        month,
      });
      setActivities(Array.isArray(data.items) ? data.items : []);
      // 同时获取所有活动用于提取筛选选项
      const allData = await getGameActivities();
      setAllActivities(Array.isArray(allData.items) ? allData.items : []);
    } catch (error) {
      logger.error('Failed to fetch activities', error);
    } finally {
      setLoading(false);
    }
  };

  const timelineDays = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(year, month - 1, index + 1);
      const today = new Date();

      return {
        date: index + 1,
        weekday: WEEKDAYS[date.getDay()],
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isToday:
          today.getDate() === index + 1 &&
          today.getMonth() + 1 === month &&
          today.getFullYear() === year,
      };
    });
  }, [year, month]);

  const ganttRows = useMemo(() => {
    const visibleActivities = Array.isArray(activities) ? activities : [];
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    const daysInMonth = timelineDays.length || 1;

    return visibleActivities
      .map((activity) => {
        const parsedStart = new Date(activity.startDatetime);
        const parsedEnd = new Date(activity.endDatetime);
        const start = Number.isNaN(parsedStart.getTime())
          ? monthStart
          : parsedStart;
        const end = Number.isNaN(parsedEnd.getTime()) ? start : parsedEnd;
        const clampedStart = new Date(
          Math.max(start.getTime(), monthStart.getTime()),
        );
        const clampedEnd = new Date(
          Math.min(end.getTime(), monthEnd.getTime()),
        );
        const startDay = Math.min(
          Math.max(clampedStart.getDate(), 1),
          daysInMonth,
        );
        const endDay = Math.min(
          Math.max(clampedEnd.getDate(), startDay),
          daysInMonth,
        );
        const left = ((startDay - 1) / daysInMonth) * 100;
        const width = Math.max(
          100 / daysInMonth,
          ((endDay - startDay + 1) / daysInMonth) * 100,
        );

        return {
          activity,
          startDay,
          endDay,
          left,
          width,
          durationDays: Math.max(
            1,
            Math.ceil((end.getTime() - start.getTime()) / DAY_MS),
          ),
          startsBeforeMonth: start.getTime() < monthStart.getTime(),
          endsAfterMonth: end.getTime() > monthEnd.getTime(),
        };
      })
      .sort((a, b) => {
        if (a.startDay !== b.startDay) return a.startDay - b.startDay;
        return (
          new Date(a.activity.startDatetime).getTime() -
          new Date(b.activity.startDatetime).getTime()
        );
      });
  }, [activities, timelineDays.length, year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleActivityClick = (activity: GameActivity) => {
    setSelectedActivity(activity);
    setDialogOpen(true);
  };

  const handleActivityMouseEnter = (
    activity: GameActivity,
    element: HTMLElement,
  ) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    setHoveredActivity(activity);
    const rect = element.getBoundingClientRect();
    setPreviewPosition({ x: rect.right + 4, y: rect.top - 20 });
  };

  const handleActivityMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredActivity(null);
    }, 800);
  };

  const parseExcelToCsv = async (file: File): Promise<string> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(firstSheet);
    return csv;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSyncing(true);
    try {
      let csvData: string;
      
      if (file.name.endsWith('.csv')) {
        csvData = await file.text();
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        csvData = await parseExcelToCsv(file);
      } else {
        throw new Error('不支持的文件格式，请上传 CSV 或 Excel (.xlsx/.xls) 文件');
      }
      
      const syncToken =
        adminToken ||
        window.sessionStorage.getItem(ADMIN_SYNC_TOKEN_STORAGE_KEY) ||
        '';
      const result = await syncGameActivitiesFromGoogleSheets(csvData, syncToken);
      if (result.success) {
        const msg = `同步成功：新增 ${result.addedCount} 条，删除 ${result.deletedCount} 条`;
        logger.info(msg);
        toast.success(msg);
        await fetchActivities();
      } else {
        const errorMsg = '同步失败: ' + result.errors.join(', ');
        logger.error(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response
        ?.status;

      if (status === 403) {
        window.sessionStorage.removeItem(ADMIN_SYNC_TOKEN_STORAGE_KEY);
        setAdminToken('');
        toast.error('管理员口令无效或服务端未配置同步口令');
        return;
      }

      const errorMsg = '同步失败: ' + String(error);
      logger.error(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSyncing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    let token = adminToken.trim();

    if (!token) {
      token = window.prompt('请输入管理员同步口令')?.trim() || '';

      if (!token) {
        toast.error('需要管理员口令才能同步');
        return;
      }

      window.sessionStorage.setItem(ADMIN_SYNC_TOKEN_STORAGE_KEY, token);
      setAdminToken(token);
    }

    window.setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // 从所有数据中动态提取地区和语言列表（不依赖筛选条件）
  const availableRegions = useMemo(() => {
    const sourceActivities = Array.isArray(allActivities) ? allActivities : [];
    const regions = new Set(sourceActivities.map(a => a.region).filter(Boolean));
    return ['', ...Array.from(regions).sort()];
  }, [allActivities]);

  const availableLanguages = useMemo(() => {
    const sourceActivities = Array.isArray(allActivities) ? allActivities : [];
    const languages = new Set(sourceActivities.map(a => a.language).filter(Boolean));
    return ['', ...Array.from(languages).sort()];
  }, [allActivities]);

  const getRegionLabel = (region: string) => {
    if (!region) return 'All Regions';
    return REGION_LABELS[region] || region;
  };

  const getLanguageLabel = (language: string) => {
    if (!language) return 'All Languages';
    return LANGUAGE_LABELS[language] || language;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_30%),linear-gradient(to_bottom,#f8fafc,#eef2ff)] p-6 text-slate-900">
      <div className="mx-auto max-w-[1800px] space-y-5">
        {/* Header Bar */}
        <div className="flex flex-col items-start justify-between gap-4 rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-200/70 backdrop-blur lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-900 p-2.5 text-white shadow-sm">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-950">
              Event Pop-Up Calendar
            </h1>
            <p className="text-sm text-slate-500">
              {new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Region Filter - Button Group */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" aria-label="Region filter">
            <Globe className="w-4 h-4 text-slate-500 ml-2" />
            <span className="mr-1 text-xs font-semibold text-slate-500">
              Region
            </span>
            {availableRegions.filter(r => r !== '').map((region) => (
              <Button
                key={region}
                variant={selectedRegion === region ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedRegion(region)}
                className={`h-8 px-3 text-xs font-medium rounded-xl ${selectedRegion === region ? 'bg-slate-950 hover:bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'}`}
              >
                {region}
              </Button>
            ))}
          </div>

          {/* Language Filter - Button Group */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <Languages className="w-4 h-4 text-slate-500 ml-2 mr-1" />
            {availableLanguages.filter(l => l !== '').map((language) => (
              <Button
                key={language}
                variant={selectedLanguage === language ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedLanguage(language)}
                className={`h-8 px-3 text-xs font-medium rounded-xl ${selectedLanguage === language ? 'bg-slate-950 hover:bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'}`}
              >
                {language}
              </Button>
            ))}
          </div>

          <div className="w-px h-8 bg-slate-200 mx-1" />

          {/* Month Navigation */}
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {showAdminControls && (
            <>
              {/* Upload Button */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="default"
                size="sm"
                onClick={handleUploadClick}
                disabled={syncing}
                className="h-10 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-medium shadow-sm"
              >
                <Upload className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Upload'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Gantt Timeline */}
      <Card className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/95 shadow-sm shadow-slate-200/70">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-flex items-center gap-2 text-slate-500">
                <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                Loading events...
              </div>
            </div>
          ) : ganttRows.length === 0 ? (
            <div className="p-16 text-center text-sm font-medium text-slate-500">
              No events in this month.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="min-w-[1120px]"
                style={{
                  width: `${Math.max(1120, 300 + timelineDays.length * 48)}px`,
                }}
              >
                <div
                  className="grid border-b border-slate-200 bg-slate-50/95"
                  style={{
                    gridTemplateColumns: `300px minmax(${timelineDays.length * 48}px, 1fr)`,
                  }}
                >
                  <div className="flex h-16 items-center border-r border-slate-200 px-5 text-sm font-bold text-slate-600">
                    Event
                  </div>
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${timelineDays.length}, minmax(48px, 1fr))`,
                    }}
                  >
                    {timelineDays.map((day) => (
                      <div
                        key={day.date}
                        className={`flex h-16 flex-col items-center justify-center border-r border-slate-200 text-xs last:border-r-0 ${
                          day.isToday
                            ? 'bg-slate-950 text-white'
                            : day.isWeekend
                              ? 'bg-slate-100/70 text-slate-500'
                              : 'text-slate-600'
                        }`}
                      >
                        <span className="text-sm font-bold">{day.date}</span>
                        <span className="text-[10px] uppercase opacity-75">
                          {day.weekday.slice(0, 3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {ganttRows.map((row) => (
                  <div
                    key={row.activity.id}
                    className="grid min-h-[78px] border-b border-slate-100 last:border-b-0"
                    style={{
                      gridTemplateColumns: `300px minmax(${timelineDays.length * 48}px, 1fr)`,
                    }}
                  >
                    <button
                      onClick={() => handleActivityClick(row.activity)}
                      onMouseEnter={(e) =>
                        handleActivityMouseEnter(row.activity, e.currentTarget)
                      }
                      onMouseLeave={handleActivityMouseLeave}
                      className="group flex min-w-0 items-center gap-3 border-r border-slate-100 bg-white px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <div className="h-12 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-300 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_52%,#334155_100%)] shadow-sm">
                        <img
                          src={row.activity.imageUrl}
                          alt="Activity"
                          className="h-full w-full object-contain p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2248%22 viewBox=%220 0 80 48%22%3E%3Crect width=%2280%22 height=%2248%22 fill=%22%231e293b%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22 font-size=%2210%22%3EImage%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-slate-950">
                          {row.activity.activityId
                            ? `#${row.activity.activityId}`
                            : 'Activity'}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {formatDate(row.activity.startDatetime)} -{' '}
                          {formatDate(row.activity.endDatetime)}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge className="h-5 bg-blue-100 px-2 text-[10px] text-blue-700 hover:bg-blue-100">
                            {row.activity.region}
                          </Badge>
                          <Badge className="h-5 bg-slate-100 px-2 text-[10px] text-slate-600 hover:bg-slate-100">
                            {row.activity.language}
                          </Badge>
                          <Badge className="h-5 bg-emerald-50 px-2 text-[10px] text-emerald-700 hover:bg-emerald-50">
                            {row.durationDays}d
                          </Badge>
                        </div>
                      </div>
                    </button>

                    <div className="relative min-h-[78px] bg-white">
                      <div
                        className="absolute inset-0 grid"
                        style={{
                          gridTemplateColumns: `repeat(${timelineDays.length}, minmax(48px, 1fr))`,
                        }}
                      >
                        {timelineDays.map((day) => (
                          <div
                            key={day.date}
                            className={`border-r border-slate-100 last:border-r-0 ${
                              day.isToday
                                ? 'bg-blue-50'
                                : day.isWeekend
                                  ? 'bg-slate-50/80'
                                  : ''
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => handleActivityClick(row.activity)}
                        onMouseEnter={(e) =>
                          handleActivityMouseEnter(
                            row.activity,
                            e.currentTarget,
                          )
                        }
                        onMouseLeave={handleActivityMouseLeave}
                        className="absolute top-4 h-11 min-w-12 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-600 to-indigo-500 px-3 text-left text-white shadow-sm transition hover:from-blue-500 hover:to-indigo-500 hover:shadow-md"
                        style={{
                          left: `${row.left}%`,
                          width: `calc(${row.width}% - 8px)`,
                        }}
                      >
                        <div className="flex h-full min-w-0 items-center gap-2 overflow-hidden">
                          <div className="h-7 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-950/70">
                            <img
                              src={row.activity.imageUrl}
                              alt="Activity"
                              className="h-full w-full object-contain p-0.5"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold">
                              {row.activity.activityId
                                ? `#${row.activity.activityId}`
                                : 'Activity'}
                            </div>
                            <div className="truncate text-[10px] text-blue-100">
                              {row.startsBeforeMonth ? '< ' : ''}
                              {row.startDay}-{row.endDay}
                              {row.endsAfterMonth ? ' >' : ''}
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Hover Preview */}
      {hoveredActivity && (
        <div
          className="fixed z-50"
          style={{
            left: Math.min(previewPosition.x + 20, window.innerWidth - 620),
            top: Math.max(10, Math.min(previewPosition.y, window.innerHeight - 420)),
          }}
          onMouseEnter={() => {
            // 鼠标进入预览图时保持显示
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => setHoveredActivity(null)}
        >
          <div className="overflow-hidden rounded-2xl border border-slate-300 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_52%,#334155_100%)] shadow-2xl shadow-slate-300/60">
            <img
              src={hoveredActivity.imageUrl}
              alt="Preview"
              className="w-[600px] h-[360px] object-contain bg-slate-950"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22360%22 viewBox=%220 0 600 360%22%3E%3Crect width=%22600%22 height=%22360%22 fill=%22%23111%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2218%22%3EImage Not Available%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        </div>
      )}

      {/* Activity Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-slate-200 bg-white text-slate-900">
          {/* Custom Close Button */}
          <button
            onClick={() => setDialogOpen(false)}
            className="absolute right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600 shadow-sm transition-colors hover:bg-slate-200 hover:text-slate-950"
          >
            <X className="w-4 h-4" />
          </button>
          {selectedActivity && (
            <>
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="flex items-center gap-3 text-xl text-slate-950">
                  <span>Activity Details</span>
                  <div className="flex gap-2">
                    <Badge className="px-2.5 py-0.5 bg-blue-100 text-blue-700 hover:bg-blue-100">{selectedActivity.region}</Badge>
                    <Badge className="px-2.5 py-0.5 bg-slate-100 text-slate-600 hover:bg-slate-100">{selectedActivity.language}</Badge>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 p-6">
                {/* Main Image - Larger */}
                <div className="overflow-hidden rounded-2xl border border-slate-300 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_52%,#334155_100%)] shadow-sm group">
                  <img
                    src={selectedActivity.imageUrl}
                    alt="Activity Image"
                    className="w-full h-[420px] object-contain p-4 transition-transform duration-500 group-hover:scale-[1.02]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22 viewBox=%220 0 400 300%22%3E%3Crect width=%22400%22 height=%22300%22 fill=%22%23222%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2214%22%3EImage Not Available%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>

                {/* Compact Info Grid */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                      <Globe className="w-3 h-3" />
                      Region
                    </div>
                    <div className="text-sm font-medium text-slate-900">{getRegionLabel(selectedActivity.region)}</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                      <Languages className="w-3 h-3" />
                      Language
                    </div>
                    <div className="text-sm font-medium text-slate-900">{getLanguageLabel(selectedActivity.language)}</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-500 mb-0.5">ID</div>
                    <div className="text-sm font-medium text-slate-900">{selectedActivity.activityId || '-'}</div>
                  </div>
                  <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-xs text-blue-500 mb-0.5">Duration</div>
                    <div className="text-sm font-medium text-blue-700">
                      {Math.ceil((new Date(selectedActivity.endDatetime).getTime() - new Date(selectedActivity.startDatetime).getTime()) / (1000 * 60 * 60 * 24))}d
                    </div>
                  </div>
                </div>

                {/* Time Info - Compact */}
                <div className="flex gap-3 text-xs">
                  <div className="flex-1 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                    <span className="text-emerald-600">Start:</span>
                    <span className="ml-2 text-emerald-800">{formatDate(selectedActivity.startDatetime)}</span>
                  </div>
                  <div className="flex-1 p-2 bg-amber-50 rounded-lg border border-amber-100">
                    <span className="text-amber-600">End:</span>
                    <span className="ml-2 text-amber-800">{formatDate(selectedActivity.endDatetime)}</span>
                  </div>
                </div>

                <UniversalLink
                  to={selectedActivity.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-950 text-white rounded-xl hover:bg-slate-800 transition-all shadow-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Original Image
                </UniversalLink>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      </div>
    </div>
  );
};

export default ActivityCalendarPage;
