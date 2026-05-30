'use client';

import { useState } from 'react';
import Image from 'next/image';
import { resolveAppIcon } from '@/lib/app-icon';

const AVATAR_COLORS = [
  'from-pink-500/80 to-rose-500/80',
  'from-violet-500/80 to-purple-500/80',
  'from-sky-500/80 to-cyan-500/80',
  'from-emerald-500/80 to-teal-500/80',
  'from-amber-500/80 to-orange-500/80',
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface AppIconProps {
  name: string;
  icon?: string | null;
  size?: 'sm' | 'md' | 'lg';
  /** Override size classes entirely (e.g. 'w-9 h-9 text-sm') */
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-xl',
};

export function AppIcon({ name, icon, size = 'md', className }: AppIconProps) {
  const [errored, setErrored] = useState(false);
  const iconUrl = resolveAppIcon(icon);
  const sizeClass = className ?? SIZE_CLASSES[size];

  if (iconUrl && !errored) {
    return (
      <div className={`relative ${sizeClass} rounded-lg overflow-hidden bg-muted shrink-0`}>
        <Image
          src={iconUrl}
          alt={name}
          fill
          className="object-cover"
          unoptimized
          onError={() => setErrored(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClass} rounded-lg bg-gradient-to-br ${getAvatarColor(name)} flex items-center justify-center text-white font-bold shadow-md shadow-black/10 shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
