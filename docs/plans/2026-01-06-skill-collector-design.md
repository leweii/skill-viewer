# Skill Collector 设计文档

## 概述

在现有 skill-viewer Chrome 扩展基础上，增加「采集」功能，让用户将 GitHub 上发现的 skill 一键生成导入命令。

## 用户故事

> 作为开发者，我在 GitHub 上浏览到有用的 Claude skill，想要快速采集到本地使用。

## 核心流程

```
浏览 GitHub 仓库
    → 侧边栏自动显示 skills
    → 点击「采集」按钮
    → 选择目标路径
    → 生成 npx degit 命令
    → 自动复制到剪贴板
    → Toast 提示去终端执行
```

## 设计原则

- **轻量**：不需要安装额外软件，命令复制到终端执行
- **独立**：导入后 skill 与远程完全独立（Fork 模式）
- **灵活**：用户自由选择存储位置

## 功能范围

### 包含

- 采集按钮（每个 skill 卡片）
- 路径选择（全局/项目/自定义）
- 生成 degit 命令
- 复制到剪贴板
- Toast 反馈
- 多语言支持

### 不包含

- 订阅自动同步
- 搜索发现 / Registry
- 版本管理
- 批量采集
- 双向同步 / PR 功能

## UI 设计

### 采集按钮位置

在每个 skill 卡片右侧添加「采集」按钮：

```
┌─────────────────────────────────┐
│ 📁 skill-name           [采集] ▼│
│ AI 生成的 2-3 句话摘要...        │
└─────────────────────────────────┘
```

### 路径选择弹窗

点击「采集」后，显示下拉菜单或小弹窗：

```
┌─────────────────────────────┐
│ 选择目标路径                 │
├─────────────────────────────┤
│ ○ ~/.claude/skills/  (全局) │
│ ○ ./.claude/skills/  (项目) │
├─────────────────────────────┤
│ 自定义: [____________]      │
├─────────────────────────────┤
│           [确认采集]         │
└─────────────────────────────┘
```

### 反馈提示

复制成功后显示 Toast（3 秒后自动消失）：
```
✓ 命令已复制，请在终端中粘贴执行
```

## 命令生成逻辑

### 命令格式

```bash
npx degit <owner>/<repo>/<skill-path> <target-path>/<skill-name>
```

### 示例

```bash
# 采集到全局目录
npx degit anthropics/claude-skills/.claude/skills/debugging ~/.claude/skills/debugging

# 采集到项目目录
npx degit anthropics/claude-skills/.claude/skills/debugging ./.claude/skills/debugging
```

### 命令特点

- 一行命令，简洁明了
- 只下载指定目录，不下载整个仓库
- 无 .git 目录，导入后完全独立
- 依赖 Node.js（开发者通常有）

## 预设路径

| 选项 | 路径 | 说明 |
|------|------|------|
| 全局 | `~/.claude/skills/` | 跨项目共享 |
| 项目 | `./.claude/skills/` | 当前项目专用 |
| 自定义 | 用户输入 | 灵活指定 |

## 技术实现

### 需要修改的文件

1. **extension/content.js** - 添加采集按钮和交互逻辑
   - 在 skill 卡片渲染时添加「采集」按钮
   - 点击后显示路径选择弹窗
   - 生成 degit 命令并复制到剪贴板

2. **extension/sidebar.css** - 新增样式
   - 采集按钮样式
   - 路径选择弹窗样式

3. **extension/lib/i18n.js** - 添加多语言文本
   - 「采集」按钮文字
   - 路径选项文字
   - Toast 提示文字

### 数据流

```
点击「采集」
    → 弹出路径选择
    → 用户选择/输入路径
    → 拼接 degit 命令
    → navigator.clipboard.writeText()
    → 显示 Toast
```

### 无需修改

- manifest.json（已有必要权限）
- background.js（不需要后台处理）
- options.js/html（暂不需要配置项）

## 多语言支持

需要添加的 i18n key：

| Key | EN | ZH-CN |
|-----|-----|-------|
| collect | Collect | 采集 |
| selectTargetPath | Select target path | 选择目标路径 |
| globalPath | Global | 全局 |
| projectPath | Project | 项目 |
| customPath | Custom | 自定义 |
| confirmCollect | Confirm | 确认采集 |
| commandCopied | Command copied, paste in terminal to execute | 命令已复制，请在终端中粘贴执行 |
