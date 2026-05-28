export interface IconConfig {
  mode: 'default' | 'auto' | 'custom';
  url?: string;
}

export function parseIconConfig(icon?: string | null): IconConfig {
  if (!icon) return { mode: 'default' };
  try {
    const parsed = JSON.parse(icon);
    if (parsed && typeof parsed === 'object' && (parsed.mode === 'default' || parsed.mode === 'auto' || parsed.mode === 'custom')) {
      return parsed;
    }
  } catch {
    // not JSON — treat as default
  }
  return { mode: 'default' };
}

function extractDomain(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return null;
  }
}

export function resolveAppIcon(client: { icon?: string | null; appUrl?: string | null; redirectUris?: string[] }): string | null {
  const config = parseIconConfig(client.icon);

  if (config.mode === 'auto') {
    const domain = extractDomain(client.appUrl || client.redirectUris?.[0] || '');
    if (domain) {
      return `/api/applications/favicon?domain=${encodeURIComponent(domain)}`;
    }
  }

  if (config.mode === 'custom' && config.url) {
    return config.url;
  }

  return null;
}
