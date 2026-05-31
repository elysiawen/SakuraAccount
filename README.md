# Sakura Network Account Center

Sakura Network 统一身份认证中心 —— 一个基于 Node.js 的用户账户管理与 OAuth 2.0 / OpenID Connect 认证平台。

## 功能特性

### 用户系统
- 用户注册、登录、登出（支持"记住我"30天免登录）
- 个人资料管理（昵称、邮箱）
- 头像上传与裁剪
- 密码修改（需验证原密码）
- 登录历史记录查看

### 管理后台
- 系统数据统计面板（总用户数、活跃/禁用/封禁用户数）
- 用户管理：搜索、分页、筛选（按状态/角色）、编辑、封禁/激活、删除
- 登录日志查看：支持按用户名、状态、日期范围筛选
- 系统设置：站点名称、描述、是否开放注册、上传文件大小限制

### OAuth 2.0 / OpenID Connect 认证服务
- 完整的 OAuth 2.0 授权服务器
- 支持的授权类型：`authorization_code`、`refresh_token`、`client_credentials`、`password`
- 支持的响应类型：`code`、`token`、`id_token`、`id_token token`
- OpenID Connect 支持：`openid`、`profile`、`email` scope
- OpenID Connect Discovery 端点（`/.well-known/openid-configuration`）
- JWKS 公钥端点（`/.well-known/jwks.json`）
- Token 内省端点（`/oauth/token/info`）
- Token 撤销端点（`/oauth/token/revoke`）
- UserInfo 端点（`/oauth/userinfo`）
- JWT 签名算法可配置：HS256（对称密钥）或 RS256（RSA 密钥对）
- 用户可自助注册和管理 OAuth 应用

## 技术栈

| 层级 | 技术 |
|---|---|
| 运行时 | Node.js |
| Web 框架 | Express.js 4.18 |
| 模板引擎 | EJS |
| CSS 框架 | Bootstrap 5.3（CDN） |
| 图标库 | Font Awesome 6.0（CDN） |
| ORM | Sequelize 6.35 |
| 数据库 | SQLite（默认）/ MySQL / MariaDB |
| 会话管理 | express-session + connect-flash |
| 密码加密 | bcryptjs |
| JWT | jsonwebtoken + jose |
| 输入验证 | express-validator |
| 文件上传 | multer |
| 开发工具 | nodemon |

## 项目结构

```
account/
├── data/                        # 数据库文件目录
│   └── database.sqlite          # SQLite 数据库文件
├── public/                      # 静态资源
│   ├── css/                     # 样式文件
│   ├── js/                      # 前端脚本
│   ├── images/                  # 图片资源
│   └── uploads/                 # 用户上传文件
│       ├── avatar/              # 用户头像
│       └── app-logos/           # OAuth 应用 Logo
├── src/
│   ├── app.js                   # 应用入口
│   ├── config/
│   │   └── database.js          # 数据库连接配置
│   ├── keys/                    # RSA 密钥对（RS256 签名用）
│   ├── models/                  # Sequelize 数据模型
│   │   ├── User.js              # 用户模型
│   │   ├── LoginLog.js          # 登录日志模型
│   │   ├── Client.js            # OAuth 客户端模型
│   │   ├── AuthorizationCode.js # 授权码模型
│   │   ├── AccessToken.js       # 访问令牌模型
│   │   ├── RefreshToken.js      # 刷新令牌模型
│   │   └── IdToken.js           # ID 令牌模型
│   ├── routes/                  # 路由处理
│   │   ├── auth.js              # 认证路由（注册/登录/登出）
│   │   ├── user.js              # 用户面板路由
│   │   ├── admin.js             # 管理后台路由
│   │   ├── oauth.js             # OAuth 2.0 / OIDC 路由
│   │   ├── jwks.js              # JWKS 公钥路由
│   │   ├── application.js       # OAuth 应用管理路由
│   │   └── docs.js              # API 文档路由
│   ├── scripts/
│   │   └── init-db.js           # 数据库初始化脚本
│   ├── utils/
│   │   ├── jwt.js               # JWT 工具函数
│   │   └── getClientIp.js       # 客户端 IP 获取工具
│   └── views/                   # EJS 模板文件
│       ├── auth/                # 登录/注册页面
│       ├── user/                # 用户面板页面
│       ├── admin/               # 管理后台页面
│       ├── oauth/               # OAuth 授权页面
│       ├── docs/                # API 文档页面
│       └── layouts/             # 公共布局模板
└── package.json
```

## 快速开始

### 环境要求

- Node.js >= 14
- npm 或 yarn

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd account

# 安装依赖
npm install
```

### 配置

创建 `.env` 文件（可选，所有配置项均有默认值）：

```env
# 服务配置
NODE_ENV=development
PORT=3000

# 数据库配置（默认使用 SQLite）
DB_TYPE=sqlite
SQLITE_FILE=./data/database.sqlite

# 如使用 MySQL/MariaDB：
# DB_TYPE=mysql
# DB_NAME=sakura_account
# DB_USER=root
# DB_PASSWORD=your_password
# DB_HOST=localhost
# DB_PORT=3306

# 会话密钥（生产环境务必修改）
SESSION_SECRET=your_session_secret

# JWT 配置
JWT_ALG=HS256                    # HS256 或 RS256
JWT_SECRET=your_jwt_secret       # HS256 模式使用

# RS256 模式需配置：
# PRIVATE_KEY_PATH=src/keys/private_key.pem
# PUBLIC_KEY_PATH=src/keys/public_key.pem

# OpenID Connect 配置
OPENID_ISSUER=http://127.0.0.1:3000

# 上传配置
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE=5242880            # 5MB
```

### 初始化数据库

```bash
npm run init-db
```

此命令将：
1. 创建所有数据库表
2. 创建默认管理员账户

### 启动服务

```bash
# 开发模式（自动重载）
npm run dev

# 生产模式
npm start
```

服务启动后访问 `http://localhost:3000`。

### 默认管理员账户

| 字段 | 值 |
|---|---|
| 用户名 | `admin` |
| 密码 | `admin123` |
| 邮箱 | `admin@example.com` |

> ⚠️ **安全提示**：首次部署后请立即修改默认管理员密码。

## API 端点

### 认证接口（`/auth`）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/auth/register` | 注册页面 |
| POST | `/auth/register` | 提交注册 |
| GET | `/auth/login` | 登录页面 |
| POST | `/auth/login` | 提交登录 |
| GET | `/auth/logout` | 登出 |

### 用户面板（`/user`）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/user/dashboard` | 用户仪表盘 |
| GET | `/user/profile` | 编辑资料页面 |
| POST | `/user/profile` | 更新资料 |
| GET | `/user/change-password` | 修改密码页面 |
| POST | `/user/change-password` | 提交密码修改 |
| GET | `/user/avatar` | 头像上传页面 |
| POST | `/user/avatar` | 上传头像 |
| GET | `/user/login-history` | 登录历史 |

### OAuth 应用管理（`/user/applications`）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/user/applications` | 我的应用列表 |
| POST | `/user/applications/create` | 创建应用 |
| GET | `/user/applications/:clientId` | 应用详情 |
| POST | `/user/applications/:clientId/update` | 更新应用 |
| POST | `/user/applications/:clientId/regenerate-secret` | 重置密钥 |
| POST | `/user/applications/:clientId/delete` | 删除应用 |

### 管理后台（`/admin`）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/admin/dashboard` | 管理面板首页 |
| GET | `/admin/users` | 用户列表 |
| GET | `/admin/users/:userId` | 用户详情 |
| GET/POST | `/admin/users/:userId/edit` | 编辑用户 |
| POST | `/admin/users/:userId/delete` | 删除用户 |
| GET | `/admin/users/:userId/ban` | 封禁用户 |
| GET | `/admin/users/:userId/activate` | 激活用户 |
| GET | `/admin/logs` | 登录日志 |
| GET/POST | `/admin/settings` | 系统设置 |

### OAuth 2.0 / OpenID Connect（`/oauth`）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/oauth/authorize` | 授权端点（显示授权确认页） |
| POST | `/oauth/authorize/decision` | 处理用户授权决定 |
| POST | `/oauth/token` | 令牌端点（颁发/刷新令牌） |
| GET | `/oauth/token/info` | 令牌内省（Bearer 认证） |
| POST | `/oauth/token/revoke` | 令牌撤销 |
| GET | `/oauth/userinfo` | UserInfo 端点（Bearer 认证） |
| GET | `/.well-known/openid-configuration` | OIDC 发现文档 |
| GET | `/.well-known/jwks.json` | JWKS 公钥 |

### 其他

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/` | 首页 |
| GET | `/docs/api` | API 文档页面 |

## 数据库模型

### 用户表（`users`）

| 字段 | 类型 | 说明 |
|---|---|---|
| userId | UUID | 主键 |
| username | STRING(50) | 唯一用户名，3-50字符，字母数字下划线 |
| password | STRING | bcrypt 哈希密码 |
| nickname | STRING(50) | 昵称，默认为用户名 |
| email | STRING | 唯一邮箱 |
| avatarUrl | STRING | 头像路径 |
| role | ENUM | `admin` / `user` |
| status | ENUM | `active` / `inactive` / `banned` |
| lastLoginAt | DATE | 最后登录时间 |

### 登录日志表（`login_logs`）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 自增主键 |
| userId | UUID | 关联用户 |
| ipAddress | STRING | 客户端 IP |
| userAgent | TEXT | 浏览器 UA |
| status | ENUM | `success` / `failed` |
| failReason | STRING | 失败原因 |
| loginAt | DATE | 登录时间 |

### OAuth 客户端表（`oauth_clients`）

| 字段 | 类型 | 说明 |
|---|---|---|
| clientId | UUID | 主键 |
| clientSecret | STRING | 自动生成的 32 字节密钥 |
| name | STRING(100) | 应用名称 |
| description | TEXT | 应用描述 |
| websiteUrl | STRING | 应用主页 |
| redirectUris | TEXT | 重定向 URI（JSON 数组） |
| logoUrl | STRING | 应用 Logo 路径 |
| allowedGrantTypes | TEXT | 允许的授权类型（JSON 数组） |
| allowedResponseTypes | TEXT | 允许的响应类型（JSON 数组） |
| allowedScopes | TEXT | 允许的 Scope（JSON 数组） |
| isConfidential | BOOLEAN | 是否为机密客户端 |
| status | ENUM | `active` / `disabled` |
| createdBy | UUID | 创建者用户 ID |

### 授权码表（`oauth_authorization_codes`）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| code | STRING | 授权码（唯一） |
| clientId | UUID | 关联客户端 |
| userId | UUID | 关联用户 |
| redirectUri | STRING | 回调地址 |
| scope | TEXT | 授权范围 |
| expiresAt | DATE | 过期时间（10分钟） |
| used | BOOLEAN | 是否已使用 |

### 访问令牌表（`oauth_access_tokens`）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| token | STRING | 访问令牌（32字节十六进制） |
| clientId | UUID | 关联客户端 |
| userId | UUID | 关联用户 |
| scope | TEXT | 授权范围 |
| expiresAt | DATE | 过期时间（2小时） |
| revoked | BOOLEAN | 是否已撤销 |

### 刷新令牌表（`oauth_refresh_tokens`）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| token | STRING | 刷新令牌（40字节十六进制） |
| accessTokenId | UUID | 关联访问令牌 |
| clientId | UUID | 关联客户端 |
| userId | UUID | 关联用户 |
| expiresAt | DATE | 过期时间（30天） |
| revoked | BOOLEAN | 是否已撤销 |

### ID 令牌表（`oauth_id_tokens`）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| token | TEXT | 完整 JWT 字符串 |
| clientId | UUID | 关联客户端 |
| userId | UUID | 关联用户 |
| accessTokenId | UUID | 关联访问令牌（可空） |
| scope | TEXT | 授权范围 |
| expiresAt | DATE | 过期时间（1小时） |
| revoked | BOOLEAN | 是否已撤销 |

## 认证机制

### Web 端（Session 认证）

- 使用 `express-session` 管理会话
- 用户信息存储在 `req.session.user` 中
- 生产环境启用安全 Cookie
- "记住我"功能延长会话至 30 天
- 管理员路由额外校验 `role === 'admin'`

### API 端（OAuth 2.0 / OIDC Token 认证）

- 客户端通过 `client_id` + `client_secret` 认证（机密客户端）
- Access Token 为不透明随机字符串，存储于数据库
- Bearer Token 认证用于 `/oauth/userinfo` 和 `/oauth/token/info`
- ID Token 为签名 JWT（HS256 或 RS256 可配置）

### 密码安全

- 使用 bcrypt 进行密码哈希（10 轮盐值）
- 通过 Sequelize 的 `beforeCreate` / `beforeUpdate` Hook 自动处理

## 部署说明

### 生产环境建议

1. **务必修改默认密码和密钥**：修改 `SESSION_SECRET`、`JWT_SECRET` 及管理员默认密码
2. **配置 HTTPS**：设置 `NODE_ENV=production` 以启用安全 Cookie
3. **更换数据库**：建议生产环境使用 MySQL 或 MariaDB 替代 SQLite
4. **配置 `OPENID_ISSUER`**：设置为实际域名，如 `https://account.example.com`
5. **生成 RSA 密钥对**（如使用 RS256）：

```bash
openssl genrsa -out src/keys/private_key.pem 2048
openssl rsa -in src/keys/private_key.pem -pubout -out src/keys/public_key.pem
```

## License

MIT
