'use client'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'mark'
}

const SIZES = {
  sm: { mark: 24, text: 13, gap: 6 },
  md: { mark: 28, text: 15, gap: 8 },
  lg: { mark: 40, text: 22, gap: 10 },
}

export default function Logo({
  size = 'md',
  variant = 'full',
}: LogoProps) {
  const s = SIZES[size]

  return (
    <div style={{
      display:    'flex',
      alignItems: 'center',
      gap:        s.gap,
      userSelect: 'none',
    }}>
      {/* Mark — M shield */}
      <svg
        width={s.mark}
        height={s.mark}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shield background */}
        <rect
          x="2" y="2" width="36" height="36" rx="9"
          fill="rgba(224,184,74,0.12)"
          stroke="rgba(224,184,74,0.35)"
          strokeWidth="1"
        />
        {/* M letterform — clean geometric */}
        <path
          d="M10 28V12L20 22L30 12V28"
          stroke="#e0b84a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Match TopBar mark: no underline accent */}
      </svg>

      {/* Wordmark */}
      {variant === 'full' && (
        <span style={{
          fontSize:   s.text,
          fontWeight: 500,
          color:      '#ffffff',
          letterSpacing: '-0.01em',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          Marq<span style={{ color: '#e0b84a' }}>Bridge</span>
        </span>
      )}
    </div>
  )
}