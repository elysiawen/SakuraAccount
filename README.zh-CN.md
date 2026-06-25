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

> **⚠️ 破坏性更新（PKCE + Token 撤销）**
>
> 本次更新新增 PKCE (RFC 7636) 支持和 Token 撤销端点 (RFC 7009)。如果你从旧版本更新，**必须**运行数据库迁移脚本：
>
> ```bash
> node scripts/migrate-dbpkce.js
> ```
>
> 此迁移为 `oauth2_authorization_codes` 表添加 `code_challenge` 和 `code_challenge_method` 列。
>
> **主要变更：**
> - **PKCE（授权码交换证明密钥）** — 授权端点现在接收并验证 `code_challenge` / `code_challenge_method`。令牌端点对带有 PKCE 的授权码强制校验 `code_verifier`。
> - **Token 撤销** — 新增 `POST /oauth/revoke` 端点 (RFC 7009)，用于撤销访问令牌和刷新令牌。
> - **OIDC Discovery** — `.well-known/openid-configuration` 新增 `revocation_endpoint` 和 `code_challenge_methods_supported` 字段。

---

## 功能特性

- 🔐 **多种认证方式** — 邮箱密码、Passkey/WebAuthn、OAuth 2.0、OIDC
- 🌐 **OAuth 2.0 / OIDC 提供者** — 基于标准协议构建自己的 SSO
- 🔑 **Passkey 支持** — 基于 FIDO2/WebAuthn 的无密码登录
- 👤 **用户控制台** — 个人资料管理、会话控制、已授权应用
- 🛡️ **管理后台** — 用户管理、应用管理、审计日志
- 📊 **审计日志** — 完整的操作记录，包含 IP 和设备信息
- 🎨 **现代化 UI** — 简洁响应式设计，支持暗色模式
- 🌍 **国际化** — 内置中文和英文支持，模块化翻译文件
- 🗄️ **多数据库** — 支持 PostgreSQL 和 MySQL
- 📦 **S3 存储** — 本地存储和 S3 兼容存储
- 🧪 **OAuth 模拟器** — 交互式演示，体验完整的 OAuth 授权流程

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
| POST | `/oauth/revoke` | 令牌撤销端点 |
| GET | `/oauth/userinfo` | 用户信息端点 |
| GET | `/.well-known/openid-configuration` | OIDC 发现（标准路径） |
| GET | `/.well-known/jwks.json` | JWKS（标准路径） |
| GET | `/oauth/.well-known/openid-configuration` | OIDC 发现（别名） |
| GET | `/oauth/.well-known/jwks.json` | JWKS（别名） |

> **OIDC 客户端兼容性**：根路径的 `/.well-known/` 端点遵循 [OpenID Connect Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) 规范，确保与在 issuer URL 后拼接 `/.well-known/openid-configuration` 来发现端点的 OIDC 客户端（如 AList、Grafana、MinIO）兼容。

#### 授权参数 (`GET /oauth/authorize`)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `response_type` | string | 必填 | 固定值：`code` |
| `client_id` | string | 必填 | 应用注册时获得的 Client ID |
| `redirect_uri` | string | 必填 | 回调地址，必须与注册的地址精确匹配 |
| `state` | string | 必填 | 随机字符串，用于防止 CSRF 攻击 |
| `code_challenge` | string | 必填 | PKCE 的 S256 哈希值，用于防止授权码拦截攻击 |
| `code_challenge_method` | string | 条件必填 | PKCE 挑战方法。可选，默认 `S256`，仅接受 `S256` |
| `scope` | string | 可选 | 权限范围（如 `openid profile email`）。不传时使用应用注册的基础权限集 |
| `prompt` | string | 可选 | 控制授权页面行为。不传时系统自动判断，已授权则静默跳过。传 `consent` 强制重新确认 |

## 安全特性

- **SQL 注入防护** — 所有数据库查询使用参数化语句
- **XSS 防护** — HTML 输出进行转义处理；配置 CSP 响应头（无 `unsafe-eval`）
- **CSRF 防护** — 通过 Origin/Referer 头校验状态变更请求
- **密码哈希** — 使用 bcrypt，代价因子 12
- **会话安全** — Cookie 设置 HttpOnly、Secure、SameSite=Lax（Lax 允许 OAuth 跨站跳转携带 Cookie，同时阻止 CSRF）
- **OAuth2 时序安全** — Client Secret 比较使用 `timingSafeEqual`
- **SSRF 防护** — Favicon 代理通过 DNS 解析校验私有 IP 范围
- **路径遍历防护** — 本地存储删除时校验解析路径不逃逸出存储目录
- **开放重定向防护** — 登出回调 URL 校验协议方案
- **速率限制** — 登录、注册、WebAuthn 端点在生产环境启用速率限制
- **无敏感日志** — 移除生产环境 debug 日志，授权码和令牌不会出现在日志中

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
│   ├── .well-known/   # OIDC 发现 & JWKS（标准路径）
│   ├── admin/          # 管理后台
│   ├── api/            # API 路由
│   ├── auth/           # 登录/注册
│   ├── dashboard/      # 用户控制台
│   └── oauth/          # OAuth/OIDC 端点
├── components/         # React 组件
│   ├── theme.tsx       # 主题系统（ThemeProvider + ThemeToggle）
│   ├── primitives.tsx  # 基础 UI 组件（Spinner、BrowserIcon、NavLink）
│   ├── avatar.tsx      # 头像裁剪与上传
│   ├── Analytics.tsx   # 埋点统计 + 页面访问日志
│   ├── avatar-context.tsx  # 用户状态共享（头像、昵称）
│   └── ...
├── hooks/              # 自定义 React Hooks
│   └── useSessionCheck.ts  # 会话有效性轮询
├── i18n/               # 国际化
│   ├── locale-resolver.ts  # 统一语言检测
│   └── ...
├── lib/                # 工具库
│   ├── secret.ts       # APP_SECRET 统一初始化
│   └── storage/
│       └── utils.ts    # 存储工具函数
└── messages/           # 翻译文件 (en/zh)
    ├── common.json     # 全局共享（主题、确认框、分页）
    ├── auth.json       # 登录、注册、授权确认
    ├── dashboard.json  # 侧边栏导航、概览页
    ├── apps.json       # 应用管理 & 应用详情
    ├── docs.json       # 接入文档 & OAuth 模拟器
    ├── account.json    # 设置、会话、已授权应用
    ├── admin.json      # 管理后台
    ├── errors.json     # 错误提示
    └── api.json        # API 响应消息
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
