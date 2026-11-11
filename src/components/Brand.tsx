export function WeftMark({ size = 30, dark = true }: { size?: number; dark?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="weft-mark"
    >
      <rect width="32" height="32" rx="9" fill={dark ? '#181B16' : '#F6F2E8'} />
      <path
        d="M8.2 7.5C12.2 7.5 11.2 24.5 15.2 24.5"
        stroke={dark ? '#F6F2E8' : '#181B16'}
        strokeWidth="2.05"
        strokeLinecap="round"
      />
      <path
        d="M13.4 7.5C17.4 7.5 16.4 24.5 20.4 24.5"
        stroke="#C6F04A"
        strokeWidth="2.05"
        strokeLinecap="round"
      />
      <path
        d="M18.6 7.5C22.6 7.5 21.6 24.5 25.6 24.5"
        stroke={dark ? '#F6F2E8' : '#181B16'}
        strokeWidth="2.05"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`wordmark ${compact ? 'compact' : ''}`}>
      <span className="wordmark-name">weft</span>
      {!compact && <span className="wordmark-dot" />}
    </span>
  );
}
