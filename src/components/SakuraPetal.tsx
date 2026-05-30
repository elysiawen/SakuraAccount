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
