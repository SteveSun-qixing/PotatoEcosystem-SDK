# Changelog

All notable changes to Chips SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### In Progress
- 编辑器引擎
- 资源管理系统
- CLI工具
- 性能优化

---

## [0.1.0] - 2026-01-30

### Added

#### 核心功能
- ChipsSDK主类，提供统一的API入口
- 文件解析系统（卡片和箱子）
- 渲染引擎和基础卡片渲染器
- 主题系统和主题管理
- 插件系统

#### Core层
- EventBus事件系统
- Logger日志系统
- CacheManager缓存管理
- ConfigManager配置管理
- PermissionManager权限管理
- ProtocolClient协议客户端
- 错误处理系统（7种专用错误类）

#### 文件处理
- ZIP文件读写（零压缩率）
- YAML解析和序列化
- 卡片文件解析和序列化
- 箱子文件解析和序列化
- 数据验证和标准化

#### API
- FileAPI文件操作接口
- FileManager文件管理器
- 格式转换器（Markdown、HTML）

#### 渲染器
- RichTextRenderer富文本渲染
- MarkdownRenderer Markdown渲染
- ImageRenderer图片渲染
- VideoRenderer视频渲染

#### 工具
- ID生成器（十位62进制）
- 平台检测和适配器
- 多语言系统
- 工具函数库

### Technical
- TypeScript严格模式
- ESLint和Prettier配置
- Vitest测试框架
- 199个单元测试（100%通过）
- 100%测试覆盖率（已实现模块）

### Standards
- 完全遵循薯片协议规范
- 完全遵循卡片文件格式规范
- 完全遵循箱子文件格式规范
- 完全遵循开发规范总则

---

## [0.0.1] - 2026-01-30

### Added
- 项目初始化
- 基础架构搭建
