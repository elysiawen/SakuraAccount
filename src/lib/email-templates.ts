import { BRAND_NAME } from './constants';
import { getBaseUrl } from './utils';

const baseUrl = getBaseUrl();

/**
 * 通用邮件 HTML 外壳
 */
function emailLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#667eea,#764ba2);padding:32px 40px;text-align:center;">
              <div style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:1px;">${BRAND_NAME}</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;font-size:18px;color:#333333;">${title}</h2>
              <div style="font-size:14px;color:#666666;line-height:1.8;">
                ${content}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#fafafa;border-top:1px solid #eeeeee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#999999;">
                此邮件由 ${BRAND_NAME} 系统自动发送，请勿回复。<br/>
                如有疑问，请联系管理员。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 邮箱验证码邮件
 */
export function emailVerificationTemplate(code: string, expiryMinutes: number = 10): { subject: string; html: string } {
  const subject = `[${BRAND_NAME}] 邮箱验证码`;

  const content = `
    <p style="margin:0 0 16px;">您好，</p>
    <p style="margin:0 0 16px;">感谢您注册 ${BRAND_NAME}！您的邮箱验证码如下，有效期为 <strong>${expiryMinutes} 分钟</strong>。</p>

    <!-- Verification Code -->
    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;background:#f0f3ff;border:2px dashed #667eea;border-radius:12px;padding:20px 48px;">
        <span style="font-family:'Courier New',monospace;font-size:36px;font-weight:700;color:#4f46e5;letter-spacing:8px;">${code}</span>
      </div>
    </div>

    <p style="margin:0 0 8px;font-size:13px;color:#999999;">
      请将以上验证码输入到验证页面完成邮箱验证。
    </p>
    <p style="margin:20px 0 0;font-size:13px;color:#999999;">
      如果您没有注册 ${BRAND_NAME} 账户，请忽略此邮件。
    </p>
  `;

  return { subject, html: emailLayout(subject, content) };
}

/**
 * 密码重置邮件
 */
export function passwordResetTemplate(token: string, username: string, expiryMinutes: number = 30): { subject: string; html: string } {
  const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

  const subject = `[${BRAND_NAME}] 密码重置请求`;

  const content = `
    <p style="margin:0 0 16px;">您好，<strong>${username}</strong></p>
    <p style="margin:0 0 16px;">我们收到了您重置密码的请求。请点击下方按钮设置新密码。重置链接有效期为 <strong>${expiryMinutes} 分钟</strong>。</p>

    <!-- Button -->
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#f093fb,#f5576c);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.5px;">
        重置密码
      </a>
    </div>

    <p style="margin:0 0 8px;font-size:13px;color:#999999;">
      如果按钮无法点击，请复制以下链接到浏览器打开：
    </p>
    <p style="margin:0;font-size:13px;color:#667eea;word-break:break-all;">
      ${resetUrl}
    </p>
    <p style="margin:20px 0 0;font-size:13px;color:#999999;">
      如果您没有请求重置密码，请忽略此邮件，您的账户安全不会受到影响。
    </p>
  `;

  return { subject, html: emailLayout(subject, content) };
}

/**
 * 密码已修改通知邮件
 */
export function passwordChangedTemplate(username: string): { subject: string; html: string } {
  const subject = `[${BRAND_NAME}] 您的密码已修改`;

  const content = `
    <p style="margin:0 0 16px;">您好，<strong>${username}</strong></p>
    <p style="margin:0 0 16px;">您的 ${BRAND_NAME} 账户密码已被成功修改。</p>
    <p style="margin:0 0 16px;">如果这是您本人操作，请忽略此邮件。如果不是您本人操作，请立即登录并修改密码，或联系管理员。</p>
    <p style="margin:0;font-size:13px;color:#999999;">
      修改时间：${new Date().toLocaleString('zh-CN')}
    </p>
  `;

  return { subject, html: emailLayout(subject, content) };
}
