'use client'

import { shortName } from '@/lib/categories'
import { formatTime } from '@/lib/format'
import type { CardData } from '@/lib/draw'

type CardFaceProps = {
  card: CardData | null
  faceUp: boolean
  flipMs: number
  allExhausted: boolean
  timerActive: boolean
  timerDuration: number
  timeRemaining: number
  timerExpired: boolean
}

export function CardFace({
  card,
  faceUp,
  flipMs,
  allExhausted,
  timerActive,
  timerDuration,
  timeRemaining,
  timerExpired,
}: CardFaceProps) {
  const timerProgress = timerDuration > 0 ? timeRemaining / timerDuration : 1

  return (
    <div
      style={{
        perspective: '1000px',
        width: '100%',
        maxWidth: '320px',
        aspectRatio: '5 / 7',
      }}
    >
      <div
        data-testid="card-flip"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: `transform ${flipMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          transform: faceUp ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Back face */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
            backgroundColor: '#1a1a4e',
            borderRadius: '8px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.4)' }}>✦</span>
          <p
            style={{
              fontWeight: 700,
              fontSize: '1.5rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#fff',
              margin: 0,
            }}
          >
            Starters
          </p>
        </div>

        {/* Front face — CAH white card aesthetic */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
            backgroundColor: '#fff',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRadius: '8px',
            boxShadow: timerExpired
              ? '0 0 0 4px #ef4444, 0 8px 40px rgba(0,0,0,0.4)'
              : '0 8px 40px rgba(0,0,0,0.4)',
            boxSizing: 'border-box',
            transition: 'box-shadow 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allExhausted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    lineHeight: 1.4,
                    color: '#000',
                    margin: '0 0 8px 0',
                    textAlign: 'center',
                  }}
                >
                  All questions used!
                </p>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: '#666',
                    margin: 0,
                    textAlign: 'center',
                  }}
                >
                  Reset your session to start fresh.
                </p>
              </div>
            ) : (
              <p
                data-testid="card-question"
                style={{
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  lineHeight: 1.4,
                  color: '#000',
                  margin: 0,
                  textAlign: 'left',
                }}
              >
                {card?.question ?? ''}
              </p>
            )}
            {/* Timer countdown on card face */}
            {timerActive && timerDuration > 0 && (
              <div
                data-testid="card-timer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '4px',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: '4px',
                    backgroundColor: '#e5e5e5',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${timerProgress * 100}%`,
                      height: '100%',
                      backgroundColor: timeRemaining <= 10 ? '#ef4444' : '#000',
                      borderRadius: '2px',
                      transition: 'width 1s linear, background-color 0.3s ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: timeRemaining <= 10 ? '#ef4444' : '#000',
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: '2.4em',
                    textAlign: 'right',
                  }}
                >
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
            {timerExpired && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '4px',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>
                  Time&apos;s up!
                </span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p
              data-testid="card-category"
              style={{
                fontWeight: 700,
                fontSize: '0.65rem',
                color: '#000',
                margin: 0,
                textAlign: 'left',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {card ? shortName(card.categoryName) : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}