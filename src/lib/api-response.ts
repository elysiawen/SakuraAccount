import { NextResponse } from 'next/server';
import { tApi } from '@/i18n/api-i18n';

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

// ===== SYS_ 系统通用错误 =====

export async function paramInvalid(message?: string) {
  const msg = message || await tApi('sys.paramInvalid');
  return errorResponse('SYS_PARAM_INVALID', msg, 400);
}

export async function resourceNotFound(message?: string) {
  const msg = message || await tApi('sys.resourceNotFound');
  return errorResponse('SYS_RESOURCE_NOT_FOUND', msg, 404);
}

export async function rateLimitExceeded(retryAfter: number) {
  const msg = await tApi('sys.rateLimitExceeded', undefined, { seconds: retryAfter });
  return errorResponse('SYS_RATE_LIMIT_EXCEEDED', msg, 429);
}

export async function internalError(message?: string) {
  const msg = message || await tApi('sys.internalError');
  return errorResponse('SYS_INTERNAL_ERROR', msg, 500);
}

// ===== AUTH_ 登录鉴权错误 =====

export async function authNotLoggedIn() {
  return errorResponse('AUTH_NOT_LOGGED_IN', await tApi('auth.notLoggedIn'), 401);
}

export async function authTokenExpired() {
  return errorResponse('AUTH_TOKEN_EXPIRED', await tApi('auth.tokenExpired'), 401);
}

export async function authLoginFailed() {
  return errorResponse('AUTH_LOGIN_FAILED', await tApi('auth.loginFailed'), 401);
}

export async function authPasswordWrong() {
  return errorResponse('AUTH_PASSWORD_WRONG', await tApi('auth.passwordWrong'), 401);
}

export async function authUserNotFound() {
  return errorResponse('AUTH_USER_NOT_FOUND', await tApi('auth.userNotFound'), 404);
}

export async function authCaptchaExpired() {
  return errorResponse('AUTH_CAPTCHA_EXPIRED', await tApi('auth.captchaExpired'), 400);
}

// ===== AUTH_ 注册错误 =====

export async function authUsernameExists() {
  return errorResponse('AUTH_USERNAME_EXISTS', await tApi('auth.usernameExists'), 409);
}

export async function authWeakPassword(detail?: string) {
  const msg = detail || await tApi('auth.weakPassword');
  return errorResponse('AUTH_WEAK_PASSWORD', msg, 400);
}

// ===== AUTH_ Passkey 错误 =====

export async function authPasskeyNotFound() {
  return errorResponse('AUTH_PASSKEY_NOT_FOUND', await tApi('auth.passkeyNotFound'), 404);
}

export async function authPasskeyVerifyFailed() {
  return errorResponse('AUTH_PASSKEY_VERIFY_FAILED', await tApi('auth.passkeyVerifyFailed'), 401);
}

// ===== USER_ 用户资料错误 =====

export async function userNotFound() {
  return errorResponse('USER_NOT_FOUND', await tApi('user.notFound'), 404);
}

export async function userAvatarUploadFailed() {
  return errorResponse('USER_AVATAR_UPLOAD_FAILED', await tApi('user.avatarUploadFailed'), 500);
}

export async function userAvatarDeleteFailed() {
  return errorResponse('USER_AVATAR_DELETE_FAILED', await tApi('user.avatarDeleteFailed'), 500);
}

export async function userAvatarNotSet() {
  return errorResponse('USER_AVATAR_NOT_SET', await tApi('user.avatarNotSet'), 400);
}

export async function userAvatarSizeLimit() {
  return errorResponse('USER_AVATAR_SIZE_LIMIT', await tApi('user.avatarSizeLimit'), 400);
}

export async function userAvatarTypeInvalid() {
  return errorResponse('USER_AVATAR_TYPE_INVALID', await tApi('user.avatarTypeInvalid'), 400);
}

export async function userPasswordNotSet() {
  return errorResponse('USER_PASSWORD_NOT_SET', await tApi('user.passwordNotSet'), 400);
}

export async function userUpdateFailed() {
  return errorResponse('USER_UPDATE_FAILED', await tApi('user.updateFailed'), 500);
}

export async function userDeleteFailed() {
  return errorResponse('USER_DELETE_FAILED', await tApi('user.deleteFailed'), 500);
}

export async function userPasswordChangeFailed() {
  return errorResponse('USER_PASSWORD_CHANGE_FAILED', await tApi('user.passwordChangeFailed'), 500);
}

// ===== SESSION_ 会话错误 =====

export async function sessionListFailed() {
  return errorResponse('SESSION_LIST_FAILED', await tApi('session.listFailed'), 500);
}

export async function sessionCannotRevokeCurrent() {
  return errorResponse('SESSION_CANNOT_REVOKE_CURRENT', await tApi('session.cannotRevokeCurrent'), 400);
}

export async function sessionNotFound() {
  return errorResponse('SESSION_NOT_FOUND', await tApi('session.notFound'), 404);
}

export async function sessionRevokeAllFailed() {
  return errorResponse('SESSION_REVOKE_ALL_FAILED', await tApi('session.revokeAllFailed'), 500);
}

export async function sessionIdRequired() {
  return errorResponse('SESSION_ID_REQUIRED', await tApi('session.idRequired'), 400);
}

// ===== PASSKEY_ Passkey 操作错误 =====

export async function passkeyListFailed() {
  return errorResponse('PASSKEY_LIST_FAILED', await tApi('passkey.listFailed'), 500);
}

export async function passkeyIdRequired() {
  return errorResponse('PASSKEY_ID_REQUIRED', await tApi('passkey.idRequired'), 400);
}

export async function passkeyDeleteFailed() {
  return errorResponse('PASSKEY_DELETE_FAILED', await tApi('passkey.deleteFailed'), 500);
}

export async function passkeyOperationFailed() {
  return errorResponse('PASSKEY_OPERATION_FAILED', await tApi('passkey.operationFailed'), 500);
}

export async function passkeyInvalidRequest() {
  return errorResponse('PASSKEY_INVALID_REQUEST', await tApi('passkey.invalidRequest'), 400);
}

export async function passkeyInvalidOperation() {
  return errorResponse('PASSKEY_INVALID_OPERATION', await tApi('passkey.invalidOperation'), 400);
}

// ===== ADMIN_ 管理后台错误 =====

export async function adminPermissionDenied() {
  return errorResponse('ADMIN_PERMISSION_DENIED', await tApi('admin.permissionDenied'), 403);
}

export async function adminUserListFailed() {
  return errorResponse('ADMIN_USER_LIST_FAILED', await tApi('admin.userListFailed'), 500);
}

export async function adminUserIdRequired() {
  return errorResponse('ADMIN_USER_ID_REQUIRED', await tApi('admin.userIdRequired'), 400);
}

export async function adminCannotDeleteSelf() {
  return errorResponse('ADMIN_CANNOT_DELETE_SELF', await tApi('admin.cannotDeleteSelf'), 400);
}

export async function adminUserDeleteFailed() {
  return errorResponse('ADMIN_USER_DELETE_FAILED', await tApi('admin.userDeleteFailed'), 500);
}

export async function adminCannotChangeSelfRole() {
  return errorResponse('ADMIN_CANNOT_CHANGE_SELF_ROLE', await tApi('admin.cannotChangeSelfRole'), 400);
}

export async function adminInvalidRole() {
  return errorResponse('ADMIN_INVALID_ROLE', await tApi('admin.invalidRole'), 400);
}

export async function adminUserUpdateFailed() {
  return errorResponse('ADMIN_USER_UPDATE_FAILED', await tApi('admin.userUpdateFailed'), 500);
}

export async function adminAuditLogFailed() {
  return errorResponse('ADMIN_AUDIT_LOG_FAILED', await tApi('admin.auditLogFailed'), 500);
}

// ===== APP_ 应用管理错误 =====

export async function appIdRequired() {
  return errorResponse('APP_ID_REQUIRED', await tApi('app.idRequired'), 400);
}

export async function appNotFound() {
  return errorResponse('APP_NOT_FOUND', await tApi('app.notFound'), 404);
}

export async function appCreateFailed() {
  return errorResponse('APP_CREATE_FAILED', await tApi('app.createFailed'), 500);
}

export async function appUpdateFailed() {
  return errorResponse('APP_UPDATE_FAILED', await tApi('app.updateFailed'), 500);
}

export async function appDeleteFailed() {
  return errorResponse('APP_DELETE_FAILED', await tApi('app.deleteFailed'), 500);
}

export async function appListFailed() {
  return errorResponse('APP_LIST_FAILED', await tApi('app.listFailed'), 500);
}

export async function appClientIdRequired() {
  return errorResponse('APP_CLIENT_ID_REQUIRED', await tApi('app.clientIdRequired'), 400);
}

export async function appInvalidClient() {
  return errorResponse('APP_INVALID_CLIENT', await tApi('app.invalidClient'), 400);
}

export async function appClientIdDuplicate() {
  return errorResponse('APP_CLIENT_ID_DUPLICATE', await tApi('app.clientIdDuplicate'), 409);
}

export async function appClientIdInvalid() {
  return errorResponse('APP_CLIENT_ID_INVALID', await tApi('app.clientIdInvalid'), 400);
}

export async function appSecretInvalid() {
  return errorResponse('APP_SECRET_INVALID', await tApi('app.secretInvalid'), 400);
}

// ===== TOKEN_ 授权令牌错误 =====

export async function tokenAppRequired() {
  return errorResponse('TOKEN_APP_REQUIRED', await tApi('token.appRequired'), 400);
}

export async function tokenRevokeFailed() {
  return errorResponse('TOKEN_REVOKE_FAILED', await tApi('token.revokeFailed'), 500);
}

export async function tokenListFailed() {
  return errorResponse('TOKEN_LIST_FAILED', await tApi('token.listFailed'), 500);
}

// ===== OAUTH_ OAuth 授权错误 =====

export async function oauthAccessDenied() {
  return errorResponse('OAUTH_ACCESS_DENIED', await tApi('oauth.accessDenied'), 400);
}

// ===== APP_ 应用图标错误 =====

export async function appIconSizeLimit() {
  return errorResponse('APP_ICON_SIZE_LIMIT', await tApi('app.iconSizeLimit'), 400);
}

export async function appIconTypeInvalid() {
  return errorResponse('APP_ICON_TYPE_INVALID', await tApi('app.iconTypeInvalid'), 400);
}

export async function appIconUploadFailed() {
  return errorResponse('APP_ICON_UPLOAD_FAILED', await tApi('app.iconUploadFailed'), 500);
}

// ===== SYS_ 连接错误 =====

export async function connectionFailed(detail?: string) {
  const msg = detail || await tApi('sys.connectionFailed');
  return errorResponse('SYS_CONNECTION_FAILED', msg, 500);
}
