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

  const calendarDays = useMemo(() => {
    const visibleActivities = Array.isArray(activities) ? activities : [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: Array<{
      date: number | null;
      activities: GameActivity[];
      isCurrentMonth: boolean;
    }> = [];

    for (let i = 0; i < startPadding; i++) {
      days.push({ date: null, activities: [], isCurrentMonth: false });
    }

    for (let date = 1; date <= daysInMonth; date++) {
      const dayStart = new Date(year, month - 1, date);
      const dayEnd = new Date(year, month - 1, date, 23, 59, 59);

      const dayActivities = visibleActivities.filter((activity) => {
        const start = new Date(activity.startDatetime);
        const end = new Date(activity.endDatetime);
        return start <= dayEnd && end >= dayStart;
      });

      days.push({
        date,
        activities: dayActivities,
        isCurrentMonth: true,
      });
    }

    const remainingCells = 42 - days.length;
    for (let i = 0; i < remainingCells; i++) {
      days.push({ date: null, activities: [], isCurrentMonth: false });
    }

    return days;
  }, [activities, year, month]);

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
    <div className="space-y-6 relative min-h-screen bg-zinc-950 p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-600/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-amber-500/[0.05] to-transparent rounded-full" />
      </div>

      {/* Game Logo */}
      <div className="flex justify-center mb-8">
        <img
          src="https://miaoda.feishu.cn/aily/api/v1/feisuda/attachments/b5772ef3-a94d-47cb-85ff-2d64670a85c8/raw"
          alt="Golden & Glory"
          className="h-28 object-contain drop-shadow-[0_0_40px_rgba(180,140,50,0.4)]"
        />
      </div>
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-950/40 rounded-xl border border-orange-800/30">
            <CalendarDays className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
              Event Pop-Up Calendar
            </h1>
            <p className="text-sm text-zinc-400">
              {new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Region Filter - Button Group */}
          <div className="flex items-center gap-1.5 bg-zinc-900 rounded-xl p-1.5 border border-zinc-700" aria-label="Region filter">
            <Globe className="w-4 h-4 text-zinc-400 ml-2" />
            <span className="mr-1 text-xs font-semibold text-zinc-400">
              Region
            </span>
            {availableRegions.filter(r => r !== '').map((region) => (
              <Button
                key={region}
                variant={selectedRegion === region ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedRegion(region)}
                className={`h-8 px-3 text-xs font-medium rounded-lg ${selectedRegion === region ? 'bg-orange-800 hover:bg-orange-700 text-orange-50' : 'text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800'}`}
              >
                {region}
              </Button>
            ))}
          </div>

          {/* Language Filter - Button Group */}
          <div className="flex items-center gap-1.5 bg-zinc-900 rounded-xl p-1.5 border border-zinc-700">
            <Languages className="w-4 h-4 text-zinc-400 ml-2 mr-1" />
            {availableLanguages.filter(l => l !== '').map((language) => (
              <Button
                key={language}
                variant={selectedLanguage === language ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedLanguage(language)}
                className={`h-8 px-3 text-xs font-medium rounded-lg ${selectedLanguage === language ? 'bg-orange-800 hover:bg-orange-700 text-orange-50' : 'text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800'}`}
              >
                {language}
              </Button>
            ))}
          </div>

          <div className="w-px h-8 bg-zinc-700 mx-1" />

          {/* Month Navigation */}
          <div className="flex items-center gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-700">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8 hover:bg-zinc-800 text-zinc-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8 hover:bg-zinc-800 text-zinc-300"
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
                className="h-10 px-4 rounded-xl bg-orange-800 hover:bg-orange-700 text-orange-50 font-medium shadow-lg shadow-orange-950/50"
              >
                <Upload className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Upload'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="border-zinc-800 shadow-lg shadow-black/30 overflow-hidden bg-zinc-900/50 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: 'url(https://miaoda.feishu.cn/aily/api/v1/feisuda/attachments/50278d02-b673-48c5-9c7d-114a093c188a/raw)' }}
        />
        <CardContent className="p-0 bg-zinc-900/30 relative z-10">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-4 text-center text-sm font-semibold text-zinc-400 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-flex items-center gap-2 text-zinc-400">
                <div className="w-5 h-5 border-2 border-orange-800/30 border-t-orange-700 rounded-full animate-spin" />
                Loading events...
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`min-h-[140px] p-2.5 border-b border-r border-zinc-800/60 last:border-r-0 transition-all ${
                    day.isCurrentMonth 
                      ? 'bg-zinc-900/80 hover:bg-zinc-800/60 backdrop-blur-sm' 
                      : 'bg-zinc-950/60 backdrop-blur-sm'
                  }`}
                >
                  {day.date && (
                    <>
                      <div className={`text-sm font-semibold mb-2.5 w-7 h-7 flex items-center justify-center rounded-full ${
                        new Date().getDate() === day.date &&
                        new Date().getMonth() + 1 === month &&
                        new Date().getFullYear() === year
                          ? 'bg-orange-800 text-orange-50 shadow-md shadow-orange-900/30'
                          : 'text-zinc-400'
                      }`}>
                        {day.date}
                      </div>
                      <div className="space-y-1">
                        {day.activities.map((activity) => (
                          <button
                            key={activity.id}
                            onClick={() => handleActivityClick(activity)}
                            onMouseEnter={(e) => {
                              setHoveredActivity(activity);
                              const rect = e.currentTarget.getBoundingClientRect();
                              setPreviewPosition({ x: rect.right + 4, y: rect.top - 20 });
                            }}
                            onMouseLeave={() => {
                              // 延迟关闭，给用户足够的时间移到预览图上
                              hoverTimeoutRef.current = setTimeout(() => {
                                setHoveredActivity(null);
                              }, 800);
                            }}
                            className="w-full text-left group"
                          >
                            <div className="relative rounded overflow-hidden border border-zinc-700 hover:border-orange-700 hover:shadow-lg hover:shadow-orange-900/20 transition-all duration-200 group-hover:scale-[1.02]">
                              <img
                                src={activity.imageUrl}
                                alt="Activity"
                                className="w-full h-10 object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22%3E%3Crect width=%2240%22 height=%2240%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%228%22%3EImage%3C/text%3E%3C/svg%3E';
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                              <div className="absolute bottom-1 left-1 flex gap-1">
                                <Badge
                                  variant="secondary"
                                  className="text-[8px] px-1 py-0 h-3.5 bg-orange-900/80 text-orange-200 font-medium shadow-sm"
                                >
                                  {activity.region}
                                </Badge>
                                <Badge
                                  variant="secondary"
                                  className="text-[8px] px-1 py-0 h-3.5 bg-zinc-700/80 text-zinc-300 font-medium shadow-sm"
                                >
                                  {activity.language}
                                </Badge>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
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
          <div className="bg-zinc-900/95 backdrop-blur-sm rounded-xl overflow-hidden border border-zinc-700 shadow-2xl shadow-black/50">
            <img
              src={hoveredActivity.imageUrl}
              alt="Preview"
              className="w-[600px] h-[360px] object-contain bg-black"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22360%22 viewBox=%220 0 600 360%22%3E%3Crect width=%22600%22 height=%22360%22 fill=%22%23111%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2218%22%3EImage Not Available%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        </div>
      )}

      {/* Activity Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-zinc-900 border-zinc-800">
          {/* Custom Close Button */}
          <button
            onClick={() => setDialogOpen(false)}
            className="absolute right-4 top-4 z-50 flex items-center justify-center w-8 h-8 rounded-full bg-orange-900/60 text-orange-100 border border-orange-700/50 hover:bg-orange-800 hover:text-white shadow-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          {selectedActivity && (
            <>
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="flex items-center gap-3 text-xl text-zinc-100">
                  <span>Activity Details</span>
                  <div className="flex gap-2">
                    <Badge className="px-2.5 py-0.5 bg-orange-800 text-orange-50">{selectedActivity.region}</Badge>
                    <Badge className="px-2.5 py-0.5 bg-zinc-700 text-zinc-200">{selectedActivity.language}</Badge>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 p-6">
                {/* Main Image - Larger */}
                <div className="rounded-2xl overflow-hidden border border-zinc-700 shadow-lg shadow-black/20 group">
                  <img
                    src={selectedActivity.imageUrl}
                    alt="Activity Image"
                    className="w-full h-[420px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22 viewBox=%220 0 400 300%22%3E%3Crect width=%22400%22 height=%22300%22 fill=%22%23222%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2214%22%3EImage Not Available%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>

                {/* Compact Info Grid */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2.5 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-0.5">
                      <Globe className="w-3 h-3" />
                      Region
                    </div>
                    <div className="text-sm font-medium text-zinc-200">{getRegionLabel(selectedActivity.region)}</div>
                  </div>
                  <div className="p-2.5 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-0.5">
                      <Languages className="w-3 h-3" />
                      Language
                    </div>
                    <div className="text-sm font-medium text-zinc-200">{getLanguageLabel(selectedActivity.language)}</div>
                  </div>
                  <div className="p-2.5 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
                    <div className="text-xs text-zinc-400 mb-0.5">ID</div>
                    <div className="text-sm font-medium text-zinc-200">{selectedActivity.activityId || '-'}</div>
                  </div>
                  <div className="p-2.5 bg-orange-950/30 rounded-lg border border-orange-800/30">
                    <div className="text-xs text-orange-400/80 mb-0.5">Duration</div>
                    <div className="text-sm font-medium text-orange-200">
                      {Math.ceil((new Date(selectedActivity.endDatetime).getTime() - new Date(selectedActivity.startDatetime).getTime()) / (1000 * 60 * 60 * 24))}d
                    </div>
                  </div>
                </div>

                {/* Time Info - Compact */}
                <div className="flex gap-3 text-xs">
                  <div className="flex-1 p-2 bg-emerald-950/20 rounded-lg border border-emerald-800/20">
                    <span className="text-emerald-500/70">Start:</span>
                    <span className="ml-2 text-emerald-200">{formatDate(selectedActivity.startDatetime)}</span>
                  </div>
                  <div className="flex-1 p-2 bg-orange-950/20 rounded-lg border border-orange-800/20">
                    <span className="text-orange-500/70">End:</span>
                    <span className="ml-2 text-orange-200">{formatDate(selectedActivity.endDatetime)}</span>
                  </div>
                </div>

                <UniversalLink
                  to={selectedActivity.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-800 text-orange-50 rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-950/50 hover:shadow-orange-900/40 font-medium"
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
  );
};

export default ActivityCalendarPage;
