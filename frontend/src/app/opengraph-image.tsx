import { ImageResponse } from 'next/og'

export const alt = 'Sayso — Rehearse the conversation that scares you'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const BARS = [0.35, 0.6, 0.9, 0.5, 1, 0.7, 0.45, 0.85, 0.55, 0.95, 0.4, 0.75, 0.6, 0.3, 0.8, 0.5]

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '90px',
          background: 'radial-gradient(120% 100% at 20% 0%, #241b14, #15100C)',
          color: '#F4EFE6',
        }}
      >
        {/* linear voiceprint */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '120px' }}>
          {BARS.map((h, i) => (
            <div
              key={i}
              style={{
                width: '14px', height: `${h * 110 + 14}px`, borderRadius: '8px',
                background: 'linear-gradient(180deg, #F4A93C, #FF5C39 60%, #E8421F)',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', fontSize: '128px', fontWeight: 700, letterSpacing: '-4px', marginTop: '48px' }}>
          Sayso
        </div>
        <div style={{ display: 'flex', fontSize: '44px', color: '#B8AE9F', marginTop: '12px' }}>
          Rehearse the conversation that scares you.
        </div>
      </div>
    ),
    { ...size },
  )
}
