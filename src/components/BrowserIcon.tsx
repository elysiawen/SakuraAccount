import { FaChrome, FaFirefoxBrowser, FaSafari, FaEdge, FaOpera, FaGlobe } from 'react-icons/fa';
import type { IconType } from 'react-icons';

const BROWSER_ICONS: Record<string, IconType> = {
  Chrome: FaChrome,
  Firefox: FaFirefoxBrowser,
  Safari: FaSafari,
  Edge: FaEdge,
  Opera: FaOpera,
};

interface BrowserIconProps {
  browser: string;
  className?: string;
}

export function BrowserIcon({ browser, className = 'w-7 h-7' }: BrowserIconProps) {
  const Icon = BROWSER_ICONS[browser] || FaGlobe;
  return <Icon className={className} />;
}
