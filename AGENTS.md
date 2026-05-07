# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1-2 为设计意图与决策上下文。Code agent 实现时以 Section 3 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 游戏爱好者、社区用户，公开访问无需登录，需要快速浏览活动时间分布
- **核心目的**: 从谷歌表格同步游戏活动数据，以日历形式可视化展示，支持筛选查看活动详情
- **期望情绪**: 轻松浏览、清晰直观、游戏感活力
- **需避免的感受**: 杂乱无章、信息过载、严肃呆板

### 1.2 设计语言

- **Aesthetic Direction**: 现代清爽的游戏活动日历，以图片展示为核心，突出视觉吸引力，保持界面整洁有序
- **Visual Signature**: [网格日历布局、圆角活动卡片、柔和标签筛选、模态弹窗详情]
- **Emotional Tone**: [活力休闲 — 游戏内容需要轻松氛围，同时保持信息清晰可读]
- **Design Style**: [Rounded 圆润几何 — 游戏场景需要亲切感，pill 按钮 + 柔和阴影营造友好视觉]
- **Application Type**: [Tool] - 单页工具类应用，公开访问展示日历

## 2. Design Principles (设计理念)

1. **以图为中心**：活动图片是核心展示内容，卡片设计优先保证图片显示质量
2. **清晰时间感**：日历网格结构清晰，月份切换流畅，用户能快速定位活动时间
3. **轻量交互**：筛选实时响应，弹窗详情无刷新，保持浏览体验流畅
4. **全设备适配**：公开访问需支持移动端和桌面端，响应式保证各种屏幕可读性

## 3. Color System (色彩系统)

**配色设计理由**：游戏活动展示需要活力但不过分张扬，选择低饱和度靛蓝作为主色，既保持专业清爽又有游戏活力感，符合公开浏览场景。

### 3.1 主题颜色

> **Color Token 语义速查（供 code agent 参考）**:
> - `primary` → 主行动：按钮填充、激活态高亮、关键操作 CTA
> - `accent` → 状态反馈：Ghost/Outline 按钮 hover、DropdownMenu focus、Toggle 激活、Skeleton 占位背景
> - `muted` → 静态非交互：禁用态背景、次级说明背景、占位文字色（`text-muted-foreground`）
> - **选择原则**：用户"可以点击" → primary；交互"正在发生" → accent；内容"不可操作" → muted

| 角色               | CSS 变量               | Tailwind Class            | HSL 值    
| ------------------ | ---------------------- | ------------------------- | ---------- 
| bg                 | `--background`         | `bg-background`           | hsl(225 25% 97%)
| card               | `--card`               | `bg-card`                 | hsl(0 0% 100%)
| text               | `--foreground`         | `text-foreground`         | hsl(225 35% 15%)
| textMuted          | `--muted-foreground`   | `text-muted-foreground`   | hsl(225 15% 45%)
| primary            | `--primary`            | `bg-primary`              | hsl(235 70% 55%)
| primary-foreground | `--primary-foreground` | `text-primary-foreground` | hsl(0 0% 100%)
| accent             | `--accent`             | `bg-accent`               | hsl(235 30% 95%)
| accent-foreground  | `--accent-foreground`  | `text-accent-foreground`  | hsl(235 70% 40%)
| border             | `--border`             | `border-border`           | hsl(225 20% 90%)

## 3.3 Topbar/Header 设计策略（仅当使用顶部导航时定义）

**背景策略**：使用 `bg-card` + 底部边框，与内容区保持清晰层次，由于是单页应用无需复杂导航

**文字与图标**：
- 默认态：使用 `text-foreground`
- 激活态：使用 `text-primary`
- Hover 态：使用 `bg-accent` 作为背景高亮

**边框与分隔**：底部使用 `border-border` 细线分隔导航与内容区

## 3.4 语义颜色（可选）

| 用途 | CSS 变量 | HSL 值 | 用途说明 |
| ---- | -------- | ------ | -------- |
| success | `--success` | hsl(145 65% 45%) | 数据同步成功标识 |
| warning | `--warning` | hsl(35 90% 50%) | 已过期活动提示 |
| error | `--error` | hsl(0 70% 50%) | 加载失败错误 |

## 4. Typography (字体排版)

- **Heading**: Inter, system-ui, -apple-system, sans-serif
- **Body**: Inter, system-ui, -apple-system, sans-serif
- **字体导入**: 使用系统字体栈，无需外部引入

## 5. Layout Strategy (布局策略)

### 5.1 结构方向

**导航策略**：极简顶部导航，仅包含标题和筛选器，无需复杂导航结构。单页工具应用，所有功能都在一个页面完成。

**页面架构特征**：工具类应用，聚焦核心日历展示区域，筛选区固定顶部，日历占主体空间。

### 5.2 响应式原则

**断点策略**：
- 移动端：日历网格压缩为单列，每个日期一行显示活动，筛选器垂直排列
- 平板：日历网格保持 7 列，但缩小内边距
- 桌面端：标准 7 列日历网格，筛选器水平排列

**内容密度**：
- 移动端单列展示，增大点击区域方便触摸操作
- 桌面端多列网格，充分利用屏幕空间展示更多活动

## 6. Visual Language (视觉语言)

**形态特征**：圆润柔和 — 大圆角卡片、圆角下拉框、胶囊形状标签，整体风格轻松友好，符合游戏浏览场景。

- 圆角：卡片使用 `rounded-xl`，按钮/标签使用 `rounded-full`，输入框 `rounded-lg`
- 阴影：卡片使用 `shadow-sm`，悬浮时 `shadow-md`，保持轻薄感

**装饰策略**：极简装饰，仅通过卡片阴影和圆角建立层次，不使用额外装饰元素，让活动图片成为视觉焦点。

**动效原则**：快速响应，筛选切换时长 150ms，模态弹窗渐变浮现，hover 状态轻微放大卡片营造交互感。

**可及性保障**：

- 文字与背景对比度 ≥ 4.5:1（大字号 ≥ 3:1）
- 地区/语言标签保持足够文字对比度，方便阅读
- 交互元素（卡片、按钮、下拉框）都有明确的 hover/focus 反馈
- 活动图片无法加载时显示占位骨架，保持布局稳定