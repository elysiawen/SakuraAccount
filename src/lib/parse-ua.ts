export interface UAParsed {
  name: string;
  browser: string;
}

export function parseUA(ua: string, unknownDeviceLabel: string = 'Unknown Device'): UAParsed {
  if (!ua) return { name: unknownDeviceLabel, browser: '' };

  let os = '';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone')) os = 'iOS';
  else if (ua.includes('iPad')) os = 'iPadOS';
  else if (ua.includes('Linux')) os = 'Linux';

  let browser = '';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

  return {
    name: os && browser ? `${os} / ${browser}` : browser || os || unknownDeviceLabel,
    browser,
  };
}
