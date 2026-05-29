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
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#deployment">Deployment</a>
</p>

<p align="center">
  <a href="README.zh-CN.md">中文</a> |
  <strong>English</strong>
</p>

---

## Features

- 🔐 **Multiple Auth Methods** — Email/Password, Passkey/WebAuthn, OAuth 2.0, OIDC
- 🌐 **OAuth 2.0 / OIDC Provider** — Build your own SSO with standard protocols
- 🔑 **Passkey Support** — Passwordless login based on FIDO2/WebAuthn
- 👤 **User Dashboard** — Profile management, session control, authorized apps
- 🛡️ **Admin Panel** — User management, application management, audit logs
- 📊 **Audit Logs** — Complete operation tracking with IP and device info
- 🎨 **Modern UI** — Clean, responsive design with dark mode support
- 🌍 **i18n** — Built-in Chinese and English support
- 🗄️ **Multi-Database** — PostgreSQL and MySQL support
- 📦 **S3 Storage** — Local and S3-compatible storage for avatars and icons

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
| `APP_URL` | Application base URL | `http://localhost:3000` |
| `APP_SECRET` | Session encryption key | — |
| `WEBAUTHN_RP_NAME` | WebAuthn relying party name | `Sakura Account` |
| `WEBAUTHN_RP_ID` | WebAuthn relying party ID | `localhost` |

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
| GET | `/oauth/userinfo` | UserInfo endpoint |
| GET | `/oauth/.well-known/openid-configuration` | OIDC discovery |
| GET | `/oauth/.well-known/jwks.json` | JWKS |

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
│   ├── admin/          # Admin panel
│   ├── api/            # API routes
│   ├── auth/           # Login/Register
│   ├── dashboard/      # User dashboard
│   └── oauth/          # OAuth/OIDC endpoints
├── components/         # React components
├── i18n/               # Internationalization
├── lib/                # Utilities
└── messages/           # Translations (en/zh)
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
