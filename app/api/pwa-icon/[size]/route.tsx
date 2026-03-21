import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeStr } = await params;
  const size = Math.min(Math.max(Number(sizeStr) || 192, 16), 512);
  const r = Math.round(size * 0.18);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a4f1a 0%, #2e7d32 100%)',
          borderRadius: r,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: Math.round(size * 0.03),
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: Math.round(size * 0.24),
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          >
            <span style={{ color: '#ffffff' }}>SAM</span>
            <span style={{ color: '#f9c900' }}>WAY</span>
          </div>
          <div
            style={{
              fontSize: Math.round(size * 0.09),
              color: 'rgba(255,255,255,0.75)',
              fontWeight: 600,
              letterSpacing: '0.08em',
            }}
          >
            POINTER
          </div>
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
