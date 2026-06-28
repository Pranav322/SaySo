import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const BARS = [0.45, 0.8, 0.55, 1, 0.6, 0.85, 0.4]

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end',
          justifyContent: 'center', gap: '9px', paddingBottom: '64px',
          background: 'radial-gradient(120% 120% at 30% 20%, #241b14, #15100C)',
        }}
      >
        {BARS.map((h, i) => (
          <div
            key={i}
            style={{
              width: '13px', height: `${h * 64 + 12}px`, borderRadius: '7px',
              background: 'linear-gradient(180deg, #F4A93C, #FF5C39 60%, #E8421F)',
            }}
          />
        ))}
      </div>
    ),
    { ...size },
  )
}
