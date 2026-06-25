export function SakuraPetal({ delay, left, size, duration }: { delay: number; left: string; size: number; duration: number }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left,
        top: '-20px',
        animation: `petalFall ${duration}s linear ${delay}s infinite`,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
        <path
          d="M6 0C6 0 8 3 10 5C12 7 10 10 8 11C6 12 4 10 2 8C0 6 2 3 4 1.5C5 0.5 6 0 6 0Z"
          fill="#f9a8d4"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}

/**
 * 生成一组均匀分布的樱花花瓣
 * @param count 花瓣数量，默认 15
 */
export function SakuraPetals({ count = 15 }: { count?: number }) {
  const petals = Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    return {
      delay: (i * 1.7) % 11,
      left: `${3 + t * 92}%`,
      size: Math.round(7 + Math.sin(i * 1.3) * 4),
      duration: Math.round(12 + Math.cos(i * 0.9) * 5),
    };
  });

  return (
    <>
      {petals.map((p, i) => (
        <SakuraPetal key={i} {...p} />
      ))}
    </>
  );
}

/**
 * 带网格背景的樱花花瓣装饰区域，用于页面背景
 */
export function SakuraBackground({ count = 15, children }: { count?: number; children?: React.ReactNode }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
      <SakuraPetals count={count} />
      {children}
    </div>
  );
}
