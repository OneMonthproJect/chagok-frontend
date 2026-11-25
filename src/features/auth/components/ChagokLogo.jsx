// 차곡 로봇 얼굴 로고 (디자인 v3.0 「디자인 가이드 · Logo」). 색은 로고 고유값이라 토큰 대신 그대로 둔다.
export default function ChagokLogo({ size = 72 }) {
  return (
    <span className="chagok-logo" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="차곡 로봇 얼굴 로고">
        <rect width="64" height="64" rx="18" fill="#1F2BFF" />
        <circle cx="10" cy="34" r="5" fill="#C9CDD4" />
        <circle cx="54" cy="34" r="5" fill="#C9CDD4" />
        <rect x="10" y="12" width="44" height="42" rx="20" fill="#fff" />
        <path d="M17 17c2-8 8-12 17-12h5c7 0 12 3 15 9l-10 6H19Z" fill="#111111" />
        <path d="M39 13h15c3 0 5 2 5 4s-2 3-5 3H39Z" fill="#111111" />
        <rect x="15" y="28" width="34" height="22" rx="11" fill="#111111" />
        <g className="chagok-logo__eyes">
          <rect x="25" y="34" width="4" height="10" rx="2" fill="#fff" />
          <rect x="35" y="34" width="4" height="10" rx="2" fill="#fff" />
        </g>
      </svg>
    </span>
  )
}
