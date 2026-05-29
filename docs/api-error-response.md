# 内部 API 错误响应规范

## 一、核心设计原则

本规范适用于 Sakura Account 项目中所有非 OAuth2 / 非 OIDC 的原生业务 API（即站内前后端交互接口）。

### 1.1 协议与业务分离（双层架构）

- **HTTP 状态码**：管"大方向"（粗粒度），负责网络层、网关层、中间件层的过滤器（如：未登录、无权限、服务器崩溃、参数格式错误）
- **JSON 业务码 (code)**：管"精细业务"（细粒度），使用语义化英文大写字符串，负责告诉前端具体的业务错误原因

### 1.2 设计约束

- **禁止一律返回 200 OK**：禁止使用 200 OK 承载业务逻辑错误
- **环境感知**：生产环境下，JSON 响应中严禁泄露敏感信息（如 SQL 报错、代码堆栈 Trace）

---

## 二、基础响应格式

所有错误响应必须返回 `application/json` 格式，标准结构如下：

```json
{
  "code": "MODULE_SUBMODULE_SPECIFIC_ERR",
  "message": "展示给最终用户的友好提示话术",
  "timestamp": 1785239600
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `code` | String | ✅ | 全局唯一的英文业务错误码 |
| `message` | String | ✅ | 可直接用于前端 Toast/Dialog 弹窗的用户提示语 |
| `timestamp` | Number | ✅ | 服务器当前时间戳（秒） |

---

## 三、HTTP 状态码与业务码映射表

内部 API 严格使用以下 6 个 HTTP 状态码：

| HTTP Status | 适用场景 | 业务码示例 | 前端拦截行为 |
|-------------|----------|-----------|-------------|
| **400** | 客户端引起的业务逻辑错误、输入参数校验失败 | `SYS_PARAM_INVALID`, `AUTH_PASSWORD_WRONG` | 弹出 message |
| **401** | 未登录，或 Cookie/Session 已完全失效 | `AUTH_TOKEN_EXPIRED`, `AUTH_NOT_LOGGED_IN` | 清除缓存，重定向至 /login |
| **403** | 已登录，但角色/级别不足 | `PERMISSION_DENIED` | 提示无权访问 |
| **404** | API 路由路径不存在，或特定数据库记录已被删除 | `SYS_RESOURCE_NOT_FOUND` | 提示资源不存在 |
| **429** | 触发频率限制 | `SYS_RATE_LIMIT_EXCEEDED` | 提示操作过于频繁 |
| **500** | 后端代码崩溃、数据库连接失败等服务器异常 | `SYS_INTERNAL_ERROR` | 全局弹出 Toast |

---

## 四、业务错误码命名规范

采用 **`模块_子模块_具体错误`** 的下划线分段命名法，全大写。

### 4.1 模块前缀

| 前缀 | 说明 |
|------|------|
| `SYS_` | 系统与底座通用层错误（参数错误、限流等） |
| `AUTH_` | 账户、登录、鉴权模块错误 |
| `USER_` | 用户个人资料、设置相关错误 |
| `SESSION_` | 会话管理相关错误 |
| `PASSKEY_` | Passkey/WebAuthn 相关错误 |
| `ADMIN_` | 管理后台相关错误 |
| `APP_` | OAuth2 应用管理相关错误 |
| `TOKEN_` | OAuth2 授权令牌相关错误 |
| `OAUTH_` | OAuth 授权流程相关错误 |

### 4.2 错误码字典

#### SYS_ 系统通用

| code | message | HTTP Status |
|------|---------|-------------|
| `SYS_PARAM_INVALID` | 参数格式错误 | 400 |
| `SYS_RESOURCE_NOT_FOUND` | 资源不存在 | 404 |
| `SYS_RATE_LIMIT_EXCEEDED` | 操作过于频繁，请 X 秒后重试 | 429 |
| `SYS_INTERNAL_ERROR` | 服务器内部错误，请稍后重试 | 500 |

#### AUTH_ 登录鉴权

| code | message | HTTP Status |
|------|---------|-------------|
| `AUTH_NOT_LOGGED_IN` | 请先登录 | 401 |
| `AUTH_TOKEN_EXPIRED` | 会话已过期，请重新登录 | 401 |
| `AUTH_LOGIN_FAILED` | 用户名或密码错误 | 401 |
| `AUTH_PASSWORD_WRONG` | 当前密码错误 | 401 |
| `AUTH_USER_NOT_FOUND` | 用户不存在 | 404 |
| `AUTH_USERNAME_EXISTS` | 用户名已被注册 | 409 |
| `AUTH_EMAIL_EXISTS` | 邮箱已被注册 | 409 |
| `AUTH_WEAK_PASSWORD` | 密码强度不足 | 400 |
| `AUTH_PASSKEY_NOT_FOUND` | Passkey 不存在或无权操作 | 404 |
| `AUTH_PASSKEY_VERIFY_FAILED` | Passkey 认证失败 | 401 |

#### USER_ 用户资料

| code | message | HTTP Status |
|------|---------|-------------|
| `USER_NOT_FOUND` | 用户不存在 | 404 |
| `USER_AVATAR_UPLOAD_FAILED` | 头像上传失败，请稍后重试 | 500 |
| `USER_AVATAR_DELETE_FAILED` | 头像删除失败，请稍后重试 | 500 |
| `USER_AVATAR_NOT_SET` | 没有设置头像 | 400 |
| `USER_AVATAR_SIZE_LIMIT` | 文件大小不能超过10MB | 400 |
| `USER_AVATAR_TYPE_INVALID` | 只能上传图片文件 | 400 |
| `USER_PASSWORD_NOT_SET` | 该账号未设置密码 | 400 |
| `USER_UPDATE_FAILED` | 更新失败 | 500 |
| `USER_DELETE_FAILED` | 删除账号失败 | 500 |
| `USER_PASSWORD_CHANGE_FAILED` | 密码修改失败 | 500 |

#### SESSION_ 会话管理

| code | message | HTTP Status |
|------|---------|-------------|
| `SESSION_LIST_FAILED` | 获取会话列表失败 | 500 |
| `SESSION_CANNOT_REVOKE_CURRENT` | 不能撤销当前会话 | 400 |
| `SESSION_NOT_FOUND` | 会话不存在或无权撤销 | 404 |
| `SESSION_REVOKE_ALL_FAILED` | 撤销会话失败 | 500 |
| `SESSION_ID_REQUIRED` | 请指定会话ID | 400 |

#### PASSKEY_ Passkey 操作

| code | message | HTTP Status |
|------|---------|-------------|
| `PASSKEY_LIST_FAILED` | 获取 Passkey 列表失败 | 500 |
| `PASSKEY_ID_REQUIRED` | 请指定 Passkey ID | 400 |
| `PASSKEY_DELETE_FAILED` | 删除 Passkey 失败 | 500 |
| `PASSKEY_OPERATION_FAILED` | 操作失败 | 500 |
| `PASSKEY_INVALID_REQUEST` | 无效的请求 | 400 |
| `PASSKEY_INVALID_OPERATION` | 无效的操作 | 400 |

#### ADMIN_ 管理后台

| code | message | HTTP Status |
|------|---------|-------------|
| `ADMIN_PERMISSION_DENIED` | 无权限访问 | 403 |
| `ADMIN_USER_LIST_FAILED` | 获取用户列表失败 | 500 |
| `ADMIN_USER_ID_REQUIRED` | 请指定用户ID | 400 |
| `ADMIN_CANNOT_DELETE_SELF` | 不能删除自己的账号 | 400 |
| `ADMIN_USER_DELETE_FAILED` | 删除用户失败 | 500 |
| `ADMIN_CANNOT_CHANGE_SELF_ROLE` | 不能修改自己的角色 | 400 |
| `ADMIN_INVALID_ROLE` | 无效的角色 | 400 |
| `ADMIN_USER_UPDATE_FAILED` | 更新用户失败 | 500 |
| `ADMIN_AUDIT_LOG_FAILED` | 获取审计日志失败 | 500 |

#### APP_ 应用管理

| code | message | HTTP Status |
|------|---------|-------------|
| `APP_ID_REQUIRED` | 缺少应用ID | 400 |
| `APP_NOT_FOUND` | 应用不存在 | 404 |
| `APP_CREATE_FAILED` | 创建应用失败 | 500 |
| `APP_UPDATE_FAILED` | 更新应用失败 | 500 |
| `APP_DELETE_FAILED` | 删除应用失败 | 500 |
| `APP_LIST_FAILED` | 获取应用列表失败 | 500 |
| `APP_CLIENT_ID_REQUIRED` | 缺少必要参数: client_id | 400 |
| `APP_INVALID_CLIENT` | 无效的客户端应用 | 400 |

#### TOKEN_ 授权令牌

| code | message | HTTP Status |
|------|---------|-------------|
| `TOKEN_APP_REQUIRED` | 请指定应用 | 400 |
| `TOKEN_REVOKE_FAILED` | 撤销授权失败 | 500 |
| `TOKEN_LIST_FAILED` | 获取授权列表失败 | 500 |

#### OAUTH_ OAuth 授权

| code | message | HTTP Status |
|------|---------|-------------|
| `OAUTH_ACCESS_DENIED` | 用户拒绝了授权请求 | 400 |

---

## 五、代码实现

### 5.1 工具函数位置

```
src/lib/api-response.ts
```

### 5.2 核心函数

```typescript
import { NextResponse } from 'next/server';

export interface ApiError {
  code: string;
  message: string;
  timestamp: number;
}

/**
 * 创建标准错误响应
 * @param code 业务错误码 (MODULE_SUBMODULE_SPECIFIC_ERR)
 * @param message 用户友好的提示信息
 * @param status HTTP 状态码
 */
export function errorResponse(code: string, message: string, status: number): NextResponse {
  const body: ApiError = {
    code,
    message,
    timestamp: Math.floor(Date.now() / 1000),
  };
  return NextResponse.json(body, { status });
}
```

### 5.3 使用示例

```typescript
import { paramInvalid, authLoginFailed, internalError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return paramInvalid('请输入用户名和密码');
    }

    // ... 业务逻辑

    if (!isValid) {
      return authLoginFailed();
    }

    return NextResponse.json({ success: true, user: { ... } });
  } catch (error) {
    console.error('Login error:', error);
    return internalError();
  }
}
```

---

## 六、前端全局拦截器示例

```typescript
import axios from 'axios';

const api = axios.create({ timeout: 10000 });

api.interceptors.response.use(
  (response) => {
    // HTTP 200: 直接返回后端的 JSON 数据
    return response.data;
  },
  (error) => {
    if (!error.response) {
      showToast("网络连接失败，请检查网络");
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    const { code, message } = data || {};

    switch (status) {
      case 401:
        // 登录失效，清除本地状态并跳转
        showToast(message || "登录已过期，请重新登录");
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 1500);
        break;
      case 403:
        showToast(message || "您没有权限访问该功能");
        break;
      case 429:
        showToast(message || "操作过于频繁，请稍后再试");
        break;
      case 400:
        // 具体的业务逻辑错误，直接弹出后端配置的友好话术
        showToast(message || "请求处理失败");
        break;
      case 500:
        showToast("服务器冒烟了，请稍后再试");
        break;
      default:
        showToast(`未知错误 (${status})`);
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## 七、已重构的 API 列表

| API 路径 | 方法 | 使用的错误函数 |
|----------|------|---------------|
| `/api/auth/login` | POST | `paramInvalid`, `authLoginFailed`, `internalError` |
| `/api/auth/register` | POST | `paramInvalid`, `authUsernameExists`, `authWeakPassword` |
| `/api/auth/session` | GET | `internalError` (仅 catch 块) |
| `/api/auth/sessions` | GET/DELETE | `sessionListFailed`, `sessionCannotRevokeCurrent`, `sessionNotFound` |
| `/api/auth/change-password` | POST | `paramInvalid`, `authPasswordWrong`, `userPasswordNotSet` |
| `/api/auth/delete-account` | POST | `userDeleteFailed` |
| `/api/auth/update-profile` | POST | `paramInvalid`, `userUpdateFailed` |
| `/api/auth/webauthn` | GET/DELETE | `passkeyListFailed`, `authPasskeyNotFound` |
| `/api/auth/webauthn/login` | POST | `authPasskeyVerifyFailed`, `authUserNotFound` |
| `/api/auth/webauthn/register` | POST | `passkeyInvalidRequest`, `passkeyOperationFailed` |
| `/api/user/avatar` | POST/DELETE | `userAvatarSizeLimit`, `userAvatarTypeInvalid`, `userNotFound` |
| `/api/admin/users` | GET/DELETE/PATCH/PUT | `adminCannotDeleteSelf`, `adminInvalidRole`, `adminUserUpdateFailed` |
| `/api/admin/audit-logs` | GET | `adminAuditLogFailed` |
| `/api/applications/info` | GET | `appClientIdRequired`, `appNotFound` |
| `/api/applications/tokens` | GET/DELETE | `tokenListFailed`, `tokenAppRequired` |

---

## 八、添加新错误码

1. 在 `src/lib/api-response.ts` 中添加新的错误函数
2. 遵循命名规范：`模块_子模块_具体错误`
3. 提供友好的中文 message
4. 选择正确的 HTTP 状态码

```typescript
// 示例：添加新的业务错误
export function orderNotFound() {
  return errorResponse('ORDER_NOT_FOUND', '订单不存在', 404);
}

export function orderCreateFailed() {
  return errorResponse('ORDER_CREATE_FAILED', '创建订单失败，请稍后重试', 500);
}
```
