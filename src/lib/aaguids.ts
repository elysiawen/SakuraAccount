import aaguidData from './aaguid.json';

interface AaguidEntry {
  name: string;
  icon_light?: string;
  icon_dark?: string;
}

const AAGUID_REPOSITORY = aaguidData as Record<string, AaguidEntry>;

const FALLBACK_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIxMSIgd2lkdGg9IjE4IiBoZWlnaHQ9IjExIiByeD0iMiIgcnk9IjIiLz48cGF0aCBkPSJNNyAxMVY3YTUgNSAwIDAgMSAxMCAwdjQiLz48L3N2Zz4=';

const BROWSER_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxsaW5lIHgxPSIyIiB5MT0iMTIiIHgyPSIyMiIgeTI9IjEyIi8+PHBhdGggZD0iTTEyIDJhMTUuMyAxNS4zIDAgMCAxIDQgMTAgMTUuMyAxNS4zIDAgMCAxLTQgMTAgMTUuMyAxNS4zIDAgMCAxLTQtMTAgMTUuMyAxNS4zIDAgMCAxIDQtMTBaIi8+PC9zdmc+';

export function getAuthenticatorInfo(aaguid: string | undefined): { name: string; icon: string } {
  if (!aaguid) return { name: 'Unknown', icon: FALLBACK_ICON };

  const info = AAGUID_REPOSITORY[aaguid] || AAGUID_REPOSITORY[aaguid.toLowerCase()] || AAGUID_REPOSITORY[aaguid.toUpperCase()];

  if (info) {
    return {
      name: info.name,
      icon: info.icon_light || info.icon_dark || FALLBACK_ICON,
    };
  }

  if (aaguid === '00000000-0000-0000-0000-000000000000') {
    return { name: 'Software/Browser', icon: BROWSER_ICON };
  }

  return { name: 'Unknown', icon: FALLBACK_ICON };
}
