# Models.dev++

Models.dev++ 是一个非官方的 [models.dev](https://models.dev/) 增强探索器，用于在 models.dev 数据基础上提供更强的模型筛选、对比和详情浏览体验。项目基于 React、TypeScript、Vite 和 Tailwind CSS 构建。

[English](#english) | [中文](#modelsdev)

## AI 开发声明

本项目的产品设计、代码实现、界面文案和项目文档均完全由 AI 开发完成。项目维护者负责提出需求、审查结果并发布开源版本。

## 功能特性

- 浏览来自多个模型提供商的 AI 模型目录
- 按提供商、模型家族、状态、能力、输入模态和输出模态筛选
- 按更新时间、发布时间、名称、上下文窗口、输出上限和价格排序
- 在卡片视图和表格视图之间切换
- 查看模型详情，包括价格、token 限制、能力、模态、文档链接和原始 JSON
- 选择 2 到 8 个模型进行横向对比
- 一键复制模型 ID 或完整模型 JSON
- 支持浅色/深色主题
- 支持中文和英文界面
- 响应式布局，适配桌面端和移动端

## 数据来源与鸣谢

本项目的模型数据由 [models.dev](https://models.dev/) 提供，应用会从 `https://models.dev/api.json` 获取最新模型目录。

数据仓库：[anomalyco/models.dev](https://github.com/anomalyco/models.dev)

特别感谢 [models.dev](https://models.dev/) 及其维护者整理并开放高质量的 AI 模型元数据。本项目不是 models.dev 的官方产品，也不代表 models.dev 或相关模型提供商。“++” 仅表示本项目在交互层面增强了浏览、筛选和对比体验。

项目中的部分模型和提供商图标会从 models.dev 与 [LobeHub Icons](https://github.com/lobehub/lobe-icons) 相关静态资源加载。感谢相关开源项目和维护者。

## 技术栈

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Radix UI / shadcn 风格组件
- Lucide React
- i18next / react-i18next

## 本地开发

### 环境要求

- Node.js 18 或更高版本
- pnpm

### 安装与运行

```bash
pnpm install
pnpm dev
```

### 常用命令

```bash
pnpm dev      # 启动本地开发服务器
pnpm build    # 类型检查并构建生产版本
pnpm preview  # 预览生产构建
pnpm lint     # 运行 ESLint
```

## 项目结构

```text
src/
  components/      UI components and feature views
  components/ui/   Reusable UI primitives
  i18n/            English and Chinese translations
  lib/             Shared utilities
  App.tsx          Main application state and routing
  constants.ts     API URLs, feature constants, icon mappings
  types.ts         models.dev API and app state types
```

## 贡献

欢迎提交 issue 和 pull request。贡献前请确保：

- 变更范围清晰，避免混入无关格式化或重构
- 新增 UI 文案同步更新 `src/i18n/locales/en.json` 和 `src/i18n/locales/zh.json`
- 提交前运行 `pnpm lint` 和 `pnpm build`
- 数据字段含义以 [models.dev 数据仓库](https://github.com/anomalyco/models.dev) 为准

## 许可证

本项目基于 MIT License 开源。详见 [LICENSE](./LICENSE)。

---

## English

Models.dev++ is an unofficial enhanced explorer for [models.dev](https://models.dev/) data. It adds richer filtering, comparison, and detail views on top of the models.dev catalog. It is built with React, TypeScript, Vite, and Tailwind CSS.

## AI Development Statement

This project was fully developed by AI, including product design, code implementation, interface copy, and project documentation. The maintainer provided requirements, reviewed the results, and published the open-source version.

## Features

- Browse AI models from multiple providers
- Filter by provider, model family, status, capabilities, input modality, and output modality
- Sort by last update, release date, name, context window, output limit, and pricing
- Switch between card and table views
- Inspect detailed model information, including pricing, token limits, capabilities, modalities, documentation links, and raw JSON
- Compare 2 to 8 provider-scoped models side by side
- Copy model IDs or complete model JSON with one click
- Light and dark themes
- English and Chinese UI
- Responsive layout for desktop and mobile

## Data Source and Acknowledgments

Model data is provided by [models.dev](https://models.dev/). The app fetches the latest catalog from `https://models.dev/api.json`.

Data repository: [anomalyco/models.dev](https://github.com/anomalyco/models.dev)

Special thanks to [models.dev](https://models.dev/) and its maintainers for collecting and publishing high-quality AI model metadata. This project is not an official models.dev product and is not affiliated with models.dev or any model provider. The "++" suffix only refers to enhanced browsing, filtering, and comparison interactions.

Some model and provider icons are loaded from models.dev and static resources related to [LobeHub Icons](https://github.com/lobehub/lobe-icons). Thanks to the open-source maintainers behind those projects.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Radix UI / shadcn-style components
- Lucide React
- i18next / react-i18next

## Local Development

### Requirements

- Node.js 18 or later
- pnpm

### Install and Run

```bash
pnpm install
pnpm dev
```

### Scripts

```bash
pnpm dev      # Start the local development server
pnpm build    # Type-check and build for production
pnpm preview  # Preview the production build
pnpm lint     # Run ESLint
```

## Project Structure

```text
src/
  components/      UI components and feature views
  components/ui/   Reusable UI primitives
  i18n/            English and Chinese translations
  lib/             Shared utilities
  App.tsx          Main application state and routing
  constants.ts     API URLs, feature constants, icon mappings
  types.ts         models.dev API and app state types
```

## Contributing

Issues and pull requests are welcome. Before contributing, please make sure that:

- Each change has a clear scope and avoids unrelated formatting or refactors
- New UI copy is added to both `src/i18n/locales/en.json` and `src/i18n/locales/zh.json`
- `pnpm lint` and `pnpm build` pass before submitting
- Data field semantics follow the [models.dev data repository](https://github.com/anomalyco/models.dev)

## License

This project is open source under the MIT License. See [LICENSE](./LICENSE).
