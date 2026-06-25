<p align="center">
  <img src="public/sakura.ico" width="80" height="80" alt="Sakura Account Logo">
</p>

<h1 align="center">Sakura Account</h1>

<p align="center">
  A modern unified identity authentication platform.<br>
  Secure, scalable, and developer-friendly.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#api-reference">API</a> •
  <a href="#security">Security</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#deployment">Deployment</a>
</p>

<p align="center">
  <a href="README.zh-CN.md">中文</a> |
  <strong>English</strong>
</p>

---

> **⚠️ Breaking Change**
>
> If you are updating from commit [`9071c7b`](https://github.com/elysiawen/SakuraAccount/commit/9071c7ba5f6d79cf1f20e6fe7d9c0ae2f6258134) to [`baabaf7`](https://github.com/elysiawen/SakuraAccount/commit/baabaf77edee719bd433ffbd2c7b633941d234b4) or later, you **must** run the database migration script before starting the application:
>
> ```bash
> node scripts/migrate-client-id.js
> ```
>
> This migration renames `oauth2_clients.id` to `client_id` and makes `nano_id` the primary key. Without running this script, the application will fail to start.

> **⚠️ Breaking Change（PKCE + Token Revocation）**
>
> This update adds PKCE (RFC 7636) support and a token revocation endpoint (RFC 7009). If you are updating from an earlier version, you **must** run the database migration script:
>
> ```bash
> node scripts/migrate-dbpkce.js
> ```
>
> This migration adds `code_challenge` and `code_challenge_method` columns to the `oauth2_authorization_codes` table.
>
> **Key changes:**
> - **PKCE (Proof Key for Code Exchange)** — The authorization endpoint now accepts and validates `code_challenge` / `code_challenge_method`. The token endpoint validates `code_verifier` for authorization codes that were issued with PKCE.
> - **Token Revocation** — New `POST /oauth/revoke` endpoint (RFC 7009) for revoking access tokens and refresh tokens.
> - **OIDC Discovery** — `revocation_endpoint` and `code_challenge_methods_supported` added to `.well-known/openid-configuration`.

---

## Features

- 🔐 **Multiple Auth Methods** — Email/Password, Passkey/WebAuthn, OAuth 2.0, OIDC
- 🌐 **OAuth 2.0 / OIDC Provider** — Build your own SSO with standard protocols
- 🔑 **Passkey Support** — Passwordless login based on FIDO2/WebAuthn
- 👤 **User Dashboard** — Profile management, session control, authorized apps
- 🛡️ **Admin Panel** — User management, application management, audit logs
- 📊 **Audit Logs** — Complete operation tracking with IP and device info
- 🎨 **Modern UI** — Clean, responsive design with dark mode support
- 🌍 **i18n** — Built-in Chinese and English support, modular translation files
- 🗄️ **Multi-Database** — PostgreSQL and MySQL support
- 📦 **S3 Storage** — Local and S3-compatible storage for avatars and icons
- 🧪 **OAuth Simulator** — Interactive demo to experience the full OAuth authorization flow

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL or MySQL

### Installation

```bash
# Clone
git clone https://github.com/elysiawen/SakuraAccount.git
cd SakuraAccount

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database settings

# Initialize database
npx tsx scripts/init.ts

# Start development
npm run dev
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_TYPE` | Database type: `postgres` or `mysql` | `postgres` |
| `POSTGRES_*` | PostgreSQL connection config | — |
| `MYSQL_*` | MySQL connection config | — |
| `NEXT_PUBLIC_URL` | Application base URL (client & server) | `http://localhost:3000` |
| `APP_SECRET` | Session encryption key | — |
| `WEBAUTHN_RP_NAME` | WebAuthn relying party name | `Sakura Account` |
| `WEBAUTHN_RP_ID` | WebAuthn relying party ID | `localhost` |
| `UMAMI_SCRIPT_URL` | Umami analytics script URL (optional) | — |
| `UMAMI_WEBSITE_ID` | Umami analytics website ID (optional) | — |

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/session` | Current session |
| GET | `/api/auth/sessions` | List sessions |
| DELETE | `/api/auth/sessions` | Revoke session |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/auth/update-profile` | Update profile |

### WebAuthn

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/webauthn` | List passkeys |
| POST | `/api/auth/webauthn/register` | Register passkey |
| POST | `/api/auth/webauthn/login` | Login with passkey |
| DELETE | `/api/auth/webauthn` | Delete passkey |

### OAuth 2.0 / OIDC

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/oauth/authorize` | Authorization endpoint |
| POST | `/oauth/token` | Token endpoint |
| POST | `/oauth/revoke` | Token revocation endpoint |
| GET | `/oauth/userinfo` | UserInfo endpoint |
| GET | `/.well-known/openid-configuration` | OIDC discovery (standard path) |
| GET | `/.well-known/jwks.json` | JWKS (standard path) |
| GET | `/oauth/.well-known/openid-configuration` | OIDC discovery (alias) |
| GET | `/oauth/.well-known/jwks.json` | JWKS (alias) |

> **OIDC Client Compatibility**: The root-level `/.well-known/` endpoints follow the [OpenID Connect Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) specification, ensuring compatibility with OIDC clients (e.g. AList, Grafana, MinIO) that construct discovery URLs by appending `/.well-known/openid-configuration` to the issuer URL.

#### Authorization Parameters (`GET /oauth/authorize`)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `response_type` | string | Required | Fixed value: `code` |
| `client_id` | string | Required | The Client ID obtained when registering your app |
| `redirect_uri` | string | Required | Callback URL. Must exactly match the registered redirect URI |
| `state` | string | Required | Random string to prevent CSRF attacks |
| `code_challenge` | string | Required | S256 hash for PKCE to prevent authorization code interception |
| `code_challenge_method` | string | Conditional | PKCE challenge method. Optional — defaults to `S256`. Only `S256` accepted |
| `scope` | string | Optional | Permission scopes (e.g. `openid profile email`). Defaults to the app's base scopes |
| `prompt` | string | Optional | Controls consent behavior. Auto-skip when already authorized. Pass `consent` to force re-confirmation |

## Security

- **SQL Injection** — All database queries use parameterized statements
- **XSS Protection** — HTML output is escaped; CSP headers configured (no `unsafe-eval`)
- **CSRF Protection** — Origin/Referer header validation on state-changing requests
- **Password Hashing** — bcrypt with cost factor 12
- **Session Security** — HttpOnly, Secure, SameSite=Lax cookies (Lax allows OAuth cross-site redirects while blocking CSRF)
- **OAuth2 Timing Safety** — Client secret comparison uses `timingSafeEqual`
- **SSRF Prevention** — Favicon proxy validates DNS resolution against private IP ranges
- **Path Traversal Prevention** — Local storage delete verifies resolved paths stay within storage directory
- **Open Redirect Prevention** — Logout callback URL validated against protocol schemes
- **Rate Limiting** — Login, register, and WebAuthn endpoints are rate-limited in production
- **No Sensitive Logging** — Debug logs removed from production; authorization codes and tokens are never logged

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL / MySQL
- **Auth**: WebAuthn/FIDO2, OAuth 2.0, OIDC
- **Styling**: Tailwind CSS 4
- **i18n**: next-intl
- **Storage**: Local / S3-compatible

## Project Structure

```
src/
├── app/
│   ├── .well-known/   # OIDC discovery & JWKS (standard path)
│   ├── admin/          # Admin panel
│   ├── api/            # API routes
│   ├── auth/           # Login/Register
│   ├── dashboard/      # User dashboard
│   └── oauth/          # OAuth/OIDC endpoints
├── components/         # React components
│   ├── theme.tsx       # ThemeProvider + ThemeToggle
│   ├── primitives.tsx  # Spinner, BrowserIcon, NavLink
│   ├── avatar.tsx      # AvatarCropper + AvatarUpload
│   ├── Analytics.tsx   # Analytics + PageLogger
│   ├── avatar-context.tsx  # Shared user state (avatar, nickname)
│   └── ...
├── hooks/              # Custom React hooks
│   └── useSessionCheck.ts  # Session validity polling
├── i18n/               # Internationalization
│   ├── locale-resolver.ts  # Unified locale detection
│   └── ...
├── lib/                # Utilities
│   ├── secret.ts       # Shared APP_SECRET initialization
│   └── storage/
│       └── utils.ts    # Shared storage utilities
└── messages/           # Translations (en/zh)
    ├── common.json     # Shared UI (theme, confirm, pagination)
    ├── auth.json       # Login, register, consent
    ├── dashboard.json  # Sidebar nav, overview
    ├── apps.json       # Application management & detail
    ├── docs.json       # Integration docs & OAuth simulator
    ├── account.json    # Settings, sessions, authorized apps
    ├── admin.json      # Admin panel
    ├── errors.json     # Error messages
    └── api.json        # API response messages
```

## Deployment

```bash
# Build
npm run build

# Start
npm start
```

## License
MIT License
