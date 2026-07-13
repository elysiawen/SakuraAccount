import nodemailer from 'nodemailer';
import type { SendMailOptions } from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || 'noreply@sakura.local';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * 检查邮件服务是否已配置
 */
export function isEmailConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * 发送邮件（如果未配置 SMTP，则仅打印到控制台用于开发调试）
 */
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const transport = getTransporter();

  if (!transport) {
    // 开发模式：未配置 SMTP 时打印邮件内容到控制台
    console.log('========== [EMAIL DEBUG] ==========');
    console.log('To:', params.to);
    console.log('Subject:', params.subject);
    console.log('HTML:', params.html.substring(0, 500) + (params.html.length > 500 ? '...' : ''));
    console.log('===================================');
    return { success: true };
  }

  try {
    const mailOptions: SendMailOptions = {
      from: SMTP_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    };

    await transport.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email send failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
