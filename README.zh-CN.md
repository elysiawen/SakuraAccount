<p align="center">
  <img src="public/sakura.ico" width="80" height="80" alt="Sakura Account Logo">
</p>

<h1 align="center">Sakura Account</h1>

<p align="center">
  一个现代化的统一身份认证平台。<br>
  安全、可扩展、开发者友好。
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#api-参考">API</a> •
  <a href="#安全特性">安全</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#部署">部署</a>
</p>

<p align="center">
  <strong>中文</strong> |
  <a href="README.md">English</a>
</p>

---

> **⚠️ 破坏性更新**
>
> 如果你从 commit [`9071c7b`](https://github.com/elysiawen/SakuraAccount/commit/9071c7ba5f6d79cf1f20e6fe7d9c0ae2f6258134) 更新到 [`baabaf7`](https://github.com/elysiawen/SakuraAccount/commit/baabaf77edee719bd433ffbd2c7b633941d234b4) 或之后的版本，**必须**在启动应用前运行数据库迁移脚本：
>
> ```bash
> node scripts/migrate-client-id.js
> ```
>
> 此迁移将 `oauth2_clients.id` 重命名为 `client_id`，并将 `nano_id` 设为主键。不运行此脚本应用将无法启动。

---

## 功能特性

- 🔐 **多种认证方式** — 邮箱密码、Passkey/WebAuthn、OAuth 2.0、OIDC
- 🌐 **OAuth 2.0 / OIDC 提供者** — 基于标准协议构建自己的 SSO
- 🔑 **Passkey 支持** — 基于 FIDO2/WebAuthn 的无密码登录
- 👤 **用户控制台** — 个人资料管理、会话控制、已授权应用
- 🛡️ **管理后台** — 用户管理、应用管理、审计日志
- 📊 **审计日志** — 完整的操作记录，包含 IP 和设备信息
- 🎨 **现代化 UI** — 简洁响应式设计，支持暗色模式
- 🌍 **国际化** — 内置中文和英文支持
- 🗄️ **多数据库** — 支持 PostgreSQL 和 MySQL
- 📦 **S3 存储** — 本地存储和 S3 兼容存储

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 或 MySQL

### 安装

```bash
# 克隆仓库
git clone https://github.com/elysiawen/SakuraAccount.git
cd SakuraAccount

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 配置数据库

# 初始化数据库
npx tsx scripts/init.ts

# 启动开发服务器
npm run dev
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_TYPE` | 数据库类型：`postgres` 或 `mysql` | `postgres` |
| `POSTGRES_*` | PostgreSQL 连接配置 | — |
| `MYSQL_*` | MySQL 连接配置 | — |
| `NEXT_PUBLIC_URL` | 应用基础 URL（客户端和服务端通用） | `http://localhost:3000` |
| `APP_SECRET` | 会话加密密钥 | — |
| `WEBAUTHN_RP_NAME` | WebAuthn 依赖方名称 | `Sakura Account` |
| `WEBAUTHN_RP_ID` | WebAuthn 依赖方 ID | `localhost` |
| `UMAMI_SCRIPT_URL` | Umami 统计脚本 URL（可选） | — |
| `UMAMI_WEBSITE_ID` | Umami 统计网站 ID（可选） | — |

## API 参考

### 认证

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 退出 |
| GET | `/api/auth/session` | 当前会话 |
| GET | `/api/auth/sessions` | 会话列表 |
| DELETE | `/api/auth/sessions` | 撤销会话 |
| POST | `/api/auth/change-password` | 修改密码 |
| POST | `/api/auth/update-profile` | 更新资料 |

### WebAuthn

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/auth/webauthn` | Passkey 列表 |
| POST | `/api/auth/webauthn/register` | 注册 Passkey |
| POST | `/api/auth/webauthn/login` | Passkey 登录 |
| DELETE | `/api/auth/webauthn` | 删除 Passkey |

### OAuth 2.0 / OIDC

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/oauth/authorize` | 授权端点 |
| POST | `/oauth/token` | 令牌端点 |
| GET | `/oauth/userinfo` | 用户信息端点 |
| GET | `/oauth/.well-known/openid-configuration` | OIDC 发现 |
| GET | `/oauth/.well-known/jwks.json` | JWKS |

## 安全特性

- **SQL 注入防护** — 所有数据库查询使用参数化语句
- **XSS 防护** — HTML 输出进行转义处理；配置 CSP 响应头
- **CSRF 防护** — 通过 Origin/Referer 头校验状态变更请求
- **密码哈希** — 使用 bcrypt，代价因子 12
- **会话安全** — Cookie 设置 HttpOnly、Secure、SameSite=Lax（Lax 允许 OAuth 跨站跳转携带 Cookie，同时阻止 CSRF）
- **OAuth2 时序安全** — Client Secret 比较使用 `timingSafeEqual`
- **SSRF 防护** — Favicon 代理通过 DNS 解析校验私有 IP 范围
- **路径遍历防护** — 本地存储删除时校验解析路径不逃逸出存储目录
- **开放重定向防护** — 登出回调 URL 校验协议方案
- **速率限制** — 登录、注册、WebAuthn 端点在生产环境启用速率限制

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **数据库**: PostgreSQL / MySQL
- **认证**: WebAuthn/FIDO2, OAuth 2.0, OIDC
- **样式**: Tailwind CSS 4
- **国际化**: next-intl
- **存储**: 本地 / S3 兼容

## 项目结构

```
src/
├── app/
│   ├── admin/          # 管理后台
│   ├── api/            # API 路由
│   ├── auth/           # 登录/注册
│   ├── dashboard/      # 用户控制台
│   └── oauth/          # OAuth/OIDC 端点
├── components/         # React 组件
├── i18n/               # 国际化
├── lib/                # 工具库
└── messages/           # 翻译文件 (en/zh)
```

## 部署

```bash
# 构建
npm run build

# 启动
npm start
```

## 开源协议

MIT License
