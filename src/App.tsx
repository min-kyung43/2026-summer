import { useEffect, useState, type CSSProperties, type PointerEvent } from 'react'
import './App.css'

const archiveSignalVideo = '/media/archive-signal.mov?v=archive-signal-layer-2'

const storySlides = [
  {
    lead: '몇 년 전...',
    body: ['장성교회 청년부의 청년들이', '갑자기 사라졌다.'],
  },
  {
    lead: '청년들이 남긴 마지막 기록에는',
    body: ['반복되는 한 문장이 있었다.'],
    quote: '“ 빛이 ... 사라지고 있다 ... “',
  },
  {
    lead: '그 이후,',
    body: ['교회 곳곳의 기록 시스템이 폐쇄되었고,', '모든 데이터는 암호화되었다.'],
  },
  {
    lead: '최근,',
    body: ['정체불명의 마지막 신호 하나가 발견되었다.', '', '그리고 이걸 보고 있는 당신에게', '접속 권한이 부여되었다 ...'],
  },
]

const bootLines = [
  { text: 'SYSTEM BOOTING...', tone: 'muted' },
  { text: 'SEARCHING SIGNAL...', tone: 'muted' },
  { text: 'LAST SIGNAL FOUND', tone: 'blue' },
  { text: 'AUTHORIZED ACCESS GRANTED', tone: 'green' },
] as const

const archives = [
  { id: '01', name: '본당', status: '복구 가능', locked: false },
  { id: '02', name: '교육관', status: '잠금', locked: true },
  { id: '03', name: '식당', status: '잠금', locked: true },
  { id: '04', name: '소예배실', status: '잠금', locked: true },
  { id: '05', name: '체육관', status: '잠금', locked: true },
  { id: '06', name: '옥상', status: '잠금', locked: true },
  { id: '07', name: '마지막 기록', status: '잠금', locked: true },
] as const

type Phase = 'story' | 'boot' | 'ready' | 'archive-home' | 'archive-detail'

function ArchiveSignalOrb() {
  return (
    <div className="archive-signal-orb" aria-hidden="true">
      <div className="archive-signal-video-shell">
        <video
          className="archive-signal-video archive-signal-video-ghost"
          src={archiveSignalVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <video
          className="archive-signal-video archive-signal-video-core"
          src={archiveSignalVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      </div>
    </div>
  )
}

function App() {
  const [phase, setPhase] = useState<Phase>('story')
  const [storyIndex, setStoryIndex] = useState(0)
  const [visibleBootLines, setVisibleBootLines] = useState(0)
  const [signalShift, setSignalShift] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (phase !== 'boot') {
      return
    }

    const timers = bootLines.map((_, index) =>
      window.setTimeout(() => {
        setVisibleBootLines(index + 1)
      }, 500 + index * 700),
    )

    const finishTimer = window.setTimeout(() => {
      setPhase('ready')
    }, 500 + bootLines.length * 700 + 500)

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      window.clearTimeout(finishTimer)
    }
  }, [phase])

  const handleAdvanceStory = () => {
    if (storyIndex === storySlides.length - 1) {
      setVisibleBootLines(0)
      setPhase('boot')
      return
    }

    setStoryIndex((current) => current + 1)
  }

  const handleStart = () => {
    setPhase('archive-home')
  }

  const handleArchiveOpen = (archiveId: string) => {
    if (archiveId === '01') {
      setPhase('archive-detail')
    }
  }

  const handleArchivePointerMove = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const xRatio = (event.clientX - rect.left) / rect.width - 0.5
    const yRatio = (event.clientY - rect.top) / rect.height - 0.5

    setSignalShift({
      x: xRatio * 18,
      y: yRatio * 14,
    })
  }

  const currentSlide = storySlides[storyIndex]

  return (
    <main className="app-shell">
      <div className="screen-frame">
        <div className="screen-overlay" aria-hidden="true" />

        {phase === 'story' ? (
          <button
            type="button"
            className="story-screen"
            onClick={handleAdvanceStory}
            aria-label="다음 이야기로 이동"
          >
            <div key={`story-${storyIndex}`} className="story-content reveal">
              <p className="story-counter">
                {String(storyIndex + 1).padStart(2, '0')} /{' '}
                {String(storySlides.length).padStart(2, '0')}
              </p>

              <div className="story-copy" lang="ko">
                <p>{currentSlide.lead}</p>
                <div className="story-copy-body">
                  {currentSlide.body.map((line) => (
                    <p key={`${storyIndex}-${line || 'blank'}`}>{line || '\u00A0'}</p>
                  ))}
                </div>
                {'quote' in currentSlide && currentSlide.quote ? (
                  <div className="story-quote-block" aria-hidden="true">
                    <div className="story-divider" />
                    <p className="story-quote">{currentSlide.quote}</p>
                    <div className="story-divider" />
                  </div>
                ) : null}
              </div>
            </div>

            <div key={`progress-${storyIndex}`} className="story-bottom reveal">
              <div
                className="progress-indicator"
                aria-label={`진행 단계 ${storyIndex + 1}/${storySlides.length}`}
              >
                {storySlides.map((_, index) => (
                  <span
                    key={`step-${index + 1}`}
                    className={index === storyIndex ? 'is-active' : 'is-inactive'}
                  />
                ))}
              </div>
              <p className="continue-text">터치하여 계속</p>
            </div>
          </button>
        ) : null}

        {(phase === 'boot' || phase === 'ready') && (
          <section className="boot-screen" aria-live="polite">
            <div className="boot-panel">
              <div className="boot-lines">
                {bootLines.map((line, index) => (
                  <p
                    key={line.text}
                    className={[
                      'boot-line',
                      `tone-${line.tone}`,
                      index < visibleBootLines || phase === 'ready' ? 'is-visible' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {line.text}
                  </p>
                ))}
              </div>

              <div className={`final-panel ${phase === 'ready' ? 'is-visible' : ''}`}>
                <div className="divider" aria-hidden="true" />
                <p className="final-description" lang="ko">
                  탐색팀으로 접속합니다.
                </p>
                <button type="button" className="start-button" onClick={handleStart}>
                  [ START ]
                </button>
              </div>
            </div>
          </section>
        )}

        {phase === 'archive-home' && (
          <section
            className="archive-screen archive-home-screen"
            onPointerMove={handleArchivePointerMove}
            onPointerLeave={() => setSignalShift({ x: 0, y: 0 })}
            style={
              {
                '--signal-shift-x': `${signalShift.x}px`,
                '--signal-shift-y': `${signalShift.y}px`,
              } as CSSProperties
            }
          >
            <div className="archive-signal-layer">
              <ArchiveSignalOrb />
            </div>

            <div className="archive-home-top reveal-soft">
              <p className="archive-system-label">ARCHIVE SYSTEM</p>
              <div className="archive-rule" aria-hidden="true" />
              <div className="archive-home-copy" lang="ko">
                <p>접속이 복구되었습니다.</p>
                <p>
                  복구되지 않은 기록:
                  <br />
                  7개
                </p>
                <p>빛은 아직 완전히 사라지지 않았습니다.</p>
              </div>
              <div className="archive-rule" aria-hidden="true" />
            </div>

            <div className="archive-list" role="list" aria-label="복구된 기록 목록">
              {archives.map((archive, index) => {
                const cardClassName = archive.locked
                  ? 'archive-card is-locked'
                  : 'archive-card is-unlocked'

                return (
                  <button
                    key={archive.id}
                    type="button"
                    className={cardClassName}
                    style={{ animationDelay: `${index * 300}ms` }}
                    onClick={() => handleArchiveOpen(archive.id)}
                    disabled={archive.locked}
                    role="listitem"
                    aria-label={`ARCHIVE #${archive.id} ${archive.name} ${archive.status}`}
                  >
                    <div className="archive-card-header">
                      <span className="archive-card-id">ARCHIVE #{archive.id}</span>
                      {archive.locked ? (
                        <span className="archive-lock" aria-hidden="true">
                          LOCKED
                        </span>
                      ) : null}
                    </div>
                    <p className="archive-card-title" lang="ko">
                      {archive.name}
                    </p>
                    <p className="archive-card-status" lang="ko">
                      상태: {archive.status}
                    </p>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {phase === 'archive-detail' && (
          <section className="archive-screen archive-detail-screen">
            <button
              type="button"
              className="archive-back-button"
              onClick={() => setPhase('archive-home')}
            >
              [ RETURN TO ARCHIVE ]
            </button>

            <div className="archive-detail-panel reveal-soft">
              <p className="archive-system-label">ARCHIVE #01</p>
              <h1 className="archive-detail-title" lang="ko">
                본당
              </h1>
              <div className="archive-rule" aria-hidden="true" />
              <div className="archive-detail-copy" lang="ko">
                <p>복구 가능한 기록이 감지되었습니다.</p>
                <p>
                  오래전 본당에 남겨진 흔적이
                  <br />
                  아직 완전히 지워지지 않았습니다.
                </p>
                <p>
                  이 기록은 탐색팀이 처음으로
                  <br />
                  접속할 수 있는 출입점입니다.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default App
