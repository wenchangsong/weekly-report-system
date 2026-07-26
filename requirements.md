# 周报系统 - 需求文档

## 项目概述

构建一个全栈周报管理系统，支持团队成员填写周报、上级查阅评论、定时提醒、历史查询和 Excel 导出。

## 部署环境

- **托管平台**：Railway
- **数据持久化**：SQLite 数据库文件存储在 Railway Volume `/data` 路径，确保每次部署不会重置已有数据
- **单 Volume 限制**：Railway 当前仅支持挂载一个 Volume，因此数据库和所有持久化文件均存储在 `/data` 目录下

## 功能需求

### 1. 用户认证
- 用户注册（用户名、邮箱、密码，可选直属上级）
- 用户登录（JWT Token，7 天有效期）
- 角色系统：admin（管理员）、manager（经理）、member（普通成员）
- 默认管理员账号：admin@example.com / admin123

### 2. 周报填报
- 按周填写周报（自动计算本周一起始日期）
- 内容字段：
  - 本周完成工作（文本）
  - 下周工作计划（文本）
  - 问题与风险（文本）
- 两种状态：草稿（draft）和已提交（submitted）
- 草稿可随时编辑，已提交后不可修改
- 同一用户同一周只能有一份周报

### 3. 上下级查阅与评论
- 用户注册时可选择直属上级（supervisor_id）
- 经理/管理员可在「团队视图」查看所有直属下级的周报
- 任何登录用户可在周报详情页发表评论
- 评论支持删除（仅限评论者本人）

### 4. 定时提醒
- 管理员可配置定时提醒（Cron 表达式）
- 到指定时间，系统扫描未提交周报的用户，发送邮件提醒
- 邮件模板支持变量：{{username}}、{{week_start}}、{{week_end}}
- 默认配置：每周五 17:00 提醒
- SMTP 配置通过环境变量，未配置时仅打印日志

### 5. 历史查询
- 周报列表页支持筛选：日期范围、状态（草稿/已提交）
- 支持分页浏览
- 管理员和经理可查看下属周报

### 6. Excel 导出
- 在周报列表页一键导出当前筛选结果为 .xlsx 文件
- 导出字段：姓名、邮箱、周开始、周结束、本周工作、下周计划、问题风险、状态、提交时间
- 表头带样式（Indigo 底色白字）

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| CSS 框架 | TailwindCSS 3 |
| 状态管理 | Zustand 5 |
| 路由 | React Router v6 |
| HTTP 客户端 | Axios |
| 图标 | Lucide React（通过 SVG 内联） |
| 后端框架 | Express 4 + TypeScript |
| 数据库 | SQLite（better-sqlite3，同步 API） |
| 认证 | JWT（jsonwebtoken + bcryptjs） |
| 定时任务 | node-cron |
| Excel 生成 | exceljs |
| 邮件 | nodemailer（SMTP 可配置） |

## API 设计

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/auth/register | 注册 | 公开 |
| POST | /api/auth/login | 登录 | 公开 |
| GET | /api/auth/me | 获取当前用户 | 登录 |
| GET | /api/users | 用户列表 | admin/manager |
| GET | /api/users/subordinates | 我的下级 | admin/manager |
| GET | /api/users/supervisors | 可选上级列表 | 公开 |
| PUT | /api/users/:id | 更新用户信息 | 本人/admin |
| GET | /api/reports | 周报列表（筛选） | 登录 |
| GET | /api/reports/stats | 周报统计 | 登录 |
| GET | /api/reports/week-range | 本周日期范围 | 登录 |
| GET | /api/reports/export | Excel 导出 | 登录 |
| GET | /api/reports/:id | 周报详情 | 登录 |
| POST | /api/reports | 创建周报 | 登录 |
| PUT | /api/reports/:id | 更新周报 | 本人且草稿 |
| DELETE | /api/reports/:id | 删除周报 | 本人 |
| GET | /api/reports/:id/comments | 评论列表 | 登录 |
| POST | /api/reports/:id/comments | 发表评论 | 登录 |
| DELETE | /api/comments/:id | 删除评论 | 评论者本人 |
| GET | /api/reminders | 提醒列表 | admin |
| POST | /api/reminders | 创建提醒 | admin |
| PUT | /api/reminders/:id | 更新提醒 | admin |
| DELETE | /api/reminders/:id | 删除提醒 | admin |

## 数据库表结构

### users
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| username | TEXT UNIQUE | 用户名 |
| email | TEXT UNIQUE | 邮箱 |
| password_hash | TEXT | bcrypt 哈希 |
| role | TEXT | admin/manager/member |
| supervisor_id | INTEGER FK | 直属上级 |
| avatar_url | TEXT | 头像 URL |
| created_at | TEXT | 创建时间 |

### reports
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| user_id | INTEGER FK | 作者 |
| week_start | TEXT | 周开始日期 |
| week_end | TEXT | 周结束日期 |
| work_done | TEXT | 本周工作 |
| plan_next | TEXT | 下周计划 |
| issues | TEXT | 问题风险 |
| status | TEXT | draft/submitted |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

### comments
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| report_id | INTEGER FK | 周报 ID |
| user_id | INTEGER FK | 评论者 |
| content | TEXT | 内容 |
| created_at | TEXT | 创建时间 |

### reminders
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| cron_expression | TEXT | Cron 表达式 |
| enabled | INTEGER | 是否启用 |
| title | TEXT | 标题 |
| message_template | TEXT | 邮件模板 |
| last_triggered_at | TEXT | 上次触发时间 |

## 前端路由

| 路由 | 页面 | 访问权限 |
|------|------|----------|
| /login | 登录页 | 公开 |
| /register | 注册页 | 公开 |
| /dashboard | 仪表盘 | 登录 |
| /reports | 周报列表 | 登录 |
| /reports/new | 新建周报 | 登录 |
| /reports/:id | 周报详情 | 登录 |
| /reports/:id/edit | 编辑周报 | 本人+草稿 |
| /team | 团队视图 | manager/admin |
| /admin/reminders | 提醒管理 | admin |
| /profile | 个人设置 | 登录 |

## 设计参考

参考 GitHub、Linear、Notion 的设计风格：
- 主色调：Indigo (#6366f1 / #4f46e5)
- 背景：slate-50 (#f8fafc)
- 卡片：白底 + 1px border + 柔和阴影
- 字体：Inter，字重 400/500/600/700
- 圆角：lg (8px) / 2xl (16px)
- 间距：宽松，留白充足

## 设计决策

1. **SQLite 而非 PostgreSQL**：Railway 单 Volume 部署，SQLite 零配置、零依赖、数据文件即数据库。better-sqlite3 使用同步 API，代码更简洁。
2. **无 ORM**：4 张表，直接用 SQL 更灵活，避免 ORM 学习成本和性能损耗。
3. **JWT 存储在 localStorage**：简化实现，Bearer token 在 Axios 拦截器中自动注入。
4. **Excel 服务端生成**：避免在浏览器中加载大型 xlsx 库，利用已有的服务端查询层。
5. **node-cron 而非消息队列**：单服务器部署，无需 Redis 等外部依赖，足够简单。
