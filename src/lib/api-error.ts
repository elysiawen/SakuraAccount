/**
 * 从 API 错误响应中提取错误信息
 * 兼容新格式 { code, message, timestamp } 和旧格式 { error }
 */
export function getErrorMessage(data: unknown, fallback: string = '操作失败'): string {
  if (!data || typeof data !== 'object') return fallback;
  const apiError = data as { message?: unknown; error?: unknown };
  // 新格式：优先使用 message
  if (typeof apiError.message === 'string') return apiError.message;
  // 旧格式：兼容
  if (typeof apiError.error === 'string') return apiError.error;
  return fallback;
}

/**
 * 处理 API 响应错误
 * 抛出包含友好错误信息的 Error
 */
export async function handleApiError(response: Response, fallback: string = '操作失败'): Promise<never> {
  try {
    const data = await response.json();
    throw new Error(getErrorMessage(data, fallback));
  } catch (e) {
    if (e instanceof Error && e.message !== '操作失败') {
      throw e;
    }
    throw new Error(fallback);
  }
}
