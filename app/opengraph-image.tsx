import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'ComplyEur - Schengen Compliance Management'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '60px 80px',
          position: 'relative',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '-150px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.1)',
          }}
        />

        {/* Logo/Brand */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: 24,
            display: 'flex',
          }}
        >
          ComplyEur
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 42,
            color: '#94a3b8',
            marginBottom: 40,
            display: 'flex',
          }}
        >
          Schengen Compliance Made Simple
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 28,
            color: '#64748b',
            marginBottom: 12,
            display: 'flex',
          }}
        >
          Track EU 90/180-day visa compliance for your employees.
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#64748b',
            marginBottom: 48,
            display: 'flex',
          }}
        >
          Automated tracking. Real-time alerts. Peace of mind.
        </div>

        {/* Accent bar */}
        <div
          style={{
            width: 300,
            height: 6,
            borderRadius: 3,
            background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
            marginBottom: 32,
          }}
        />

        {/* Domain */}
        <div
          style={{
            fontSize: 24,
            color: '#475569',
            display: 'flex',
          }}
        >
          complyeur.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
