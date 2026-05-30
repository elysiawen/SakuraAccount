import { DEFAULT_ICON } from './constants';

/**
 * 解析图标配置
 * @param icon 图标字段值
 * @returns 解析后的图标配置对象
 */
export function parseIconConfig(icon?: string | null): { mode: 'default' | 'auto' | 'upload'; url?: string } {
  if (!icon) return { mode: 'default' };
  if (icon.startsWith('{')) {
    try {
      const parsed = JSON.parse(icon);
      if (parsed.url) return { mode: 'upload', url: parsed.url };
    } catch {
      // 不是有效 JSON
    }
  }
  return { mode: 'upload', url: icon };
}

/**
 * 解析应用图标
 * @param icon 图标字段值：
 *   - null/空/DEFAULT_ICON = 默认图标（首字母）
 *   - '/api/applications/favicon?domain=xxx' = 自动获取的favicon
 *   - 'https://oss...' = 上传的自定义图标URL
 * @returns 图标URL或null
 */
export function resolveAppIcon(icon?: string | null): string | null {
  if (!icon || icon === DEFAULT_ICON) {
    return null; // 使用默认首字母图标
  }
  return icon;
}
