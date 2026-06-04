import { useEffect, useState } from 'react'
import './App.css'

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

const teamOptions = ['1조', '2조', '3조', '4조', '5조', '6조', '7조'] as const

const teamProgressRows = [
  {
    teamName: '1조',
    currentStage: 'ARCHIVE #03 식당',
    progressStatus: '진행 중',
    hintUsed: true,
    lastUpdatedAt: '13:42',
  },
  {
    teamName: '2조',
    currentStage: 'ARCHIVE #02 교육관',
    progressStatus: '확인 필요',
    hintUsed: true,
    lastUpdatedAt: '13:37',
  },
  {
    teamName: '3조',
    currentStage: 'ARCHIVE #04 소예배실',
    progressStatus: '진행 중',
    hintUsed: false,
    lastUpdatedAt: '13:45',
  },
  {
    teamName: '4조',
    currentStage: 'ARCHIVE #01 본당',
    progressStatus: '진입',
    hintUsed: false,
    lastUpdatedAt: '13:31',
  },
  {
    teamName: '5조',
    currentStage: 'ARCHIVE #05 체육관',
    progressStatus: '진행 중',
    hintUsed: false,
    lastUpdatedAt: '13:44',
  },
  {
    teamName: '6조',
    currentStage: 'ARCHIVE #07 마지막 기록',
    progressStatus: '완료',
    hintUsed: true,
    lastUpdatedAt: '13:49',
  },
  {
    teamName: '7조',
    currentStage: 'ARCHIVE #02 교육관',
    progressStatus: '대기',
    hintUsed: false,
    lastUpdatedAt: '13:28',
  },
] as const

type Phase =
  | 'story'
  | 'boot'
  | 'ready'
  | 'team-select'
  | 'archive-home'
  | 'archive-detail'
  | 'step-intro'
  | 'step-story'
  | 'step-puzzle'
  | 'step-restored'
type ProgressStatus = (typeof teamProgressRows)[number]['progressStatus']

function getProgressStatusClass(status: ProgressStatus) {
  if (status === '완료') {
    return 'is-complete'
  }

  if (status === '확인 필요') {
    return 'is-attention'
  }

  if (status === '대기') {
    return 'is-idle'
  }

  if (status === '진입') {
    return 'is-entered'
  }

  return 'is-active'
}

function AdminDashboard() {
  const activeTeams = teamProgressRows.filter(
    (row) => row.progressStatus === '진행 중',
  ).length
  const hintUsedTeams = teamProgressRows.filter((row) => row.hintUsed).length
  const completedTeams = teamProgressRows.filter(
    (row) => row.progressStatus === '완료',
  ).length

  return (
    <main className="admin-shell">
      <section className="admin-panel">
        <header className="admin-header">
          <div>
            <p className="admin-kicker">RESTORED ARCHIVE MONITOR</p>
            <h1 className="admin-title">관리자 진행 현황</h1>
          </div>
          <p className="admin-timestamp">LAST SYNC 13:50</p>
        </header>

        <div className="admin-summary" aria-label="팀 진행 요약">
          <div className="admin-summary-item">
            <span>전체 조</span>
            <strong>{teamProgressRows.length}</strong>
          </div>
          <div className="admin-summary-item">
            <span>진행 중</span>
            <strong>{activeTeams}</strong>
          </div>
          <div className="admin-summary-item">
            <span>힌트 사용</span>
            <strong>{hintUsedTeams}</strong>
          </div>
          <div className="admin-summary-item">
            <span>완료</span>
            <strong>{completedTeams}</strong>
          </div>
        </div>

        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>조 이름</th>
                <th>현재 단계</th>
                <th>진행 상태</th>
                <th>힌트 사용 여부</th>
                <th>마지막 업데이트</th>
              </tr>
            </thead>
            <tbody>
              {teamProgressRows.map((row) => (
                <tr key={row.teamName}>
                  <td className="admin-team-name">{row.teamName}</td>
                  <td className="admin-stage">{row.currentStage}</td>
                  <td>
                    <span
                      className={`admin-status ${getProgressStatusClass(
                        row.progressStatus,
                      )}`}
                    >
                      {row.progressStatus}
                    </span>
                  </td>
                  <td>
                    <span className={row.hintUsed ? 'admin-hint-used' : 'admin-hint-none'}>
                      {row.hintUsed ? '사용' : '미사용'}
                    </span>
                  </td>
                  <td className="admin-updated">{row.lastUpdatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function OnboardingApp() {
  const [phase, setPhase] = useState<Phase>('story')
  const [storyIndex, setStoryIndex] = useState(0)
  const [visibleBootLines, setVisibleBootLines] = useState(0)
  const [selectedTeam, setSelectedTeam] = useState<(typeof teamOptions)[number] | null>(null)
  const [recoveryCode, setRecoveryCode] = useState('')

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
    setPhase('team-select')
  }

  const handleTeamSelect = (teamName: (typeof teamOptions)[number]) => {
    setSelectedTeam(teamName)
    setPhase('archive-home')
  }

  const handleArchiveOpen = (archiveId: string) => {
    if (archiveId === '01') {
      setPhase('step-intro')
    }
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

        {phase === 'team-select' && (
          <section className="team-select-screen" aria-labelledby="team-select-title">
            <div className="team-select-panel reveal-soft">
              <p className="team-select-kicker">TEAM ACCESS REQUIRED</p>
              <h1 id="team-select-title" className="team-select-title">
                조를 선택하세요
              </h1>
              <p className="team-select-description">
                접속할 탐색 조를 선택하면 기록 보관소가 복구됩니다.
              </p>

              <div className="team-option-grid" aria-label="조 선택">
                {teamOptions.map((teamName) => (
                  <button
                    key={teamName}
                    type="button"
                    className="team-option-button"
                    onClick={() => handleTeamSelect(teamName)}
                  >
                    {teamName}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {phase === 'archive-home' && (
          <section className="archive-screen archive-home-screen">
            <header className="home-header reveal-soft">
              <div>
                <p className="home-app-name">사라진 빛을 찾아서</p>
                <h1 className="home-title">기록 보관소</h1>
                <p className="home-subtitle">복구되지 않은 기록 7개</p>
              </div>
              <div className="home-actions" aria-label="빠른 메뉴">
                <button type="button" className="home-icon-button" aria-label="진행 현황">
                  ↆ
                </button>
                <button type="button" className="home-icon-button" aria-label="설정">
                  ·
                </button>
              </div>
            </header>

            <div className="home-card-grid">
              <button
                type="button"
                className="home-card home-card-now reveal-soft"
                onClick={() => handleArchiveOpen('01')}
              >
                <div className="home-now-header">
                  <span className="home-card-label">CURRENT OBJECTIVE</span>
                  <span className="home-now-badge">진행 중</span>
                </div>
                <div className="home-now-body">
                  <div>
                    <p className="home-now-location">현재 위치</p>
                    <h2 className="home-now-title">본당</h2>
                  </div>
                </div>
                <span className="home-now-action">첫 번째 기록 열기</span>
              </button>

              <button
                type="button"
                className="home-card home-card-primary reveal-soft"
                onClick={() => handleArchiveOpen('01')}
              >
                <span className="home-card-label">ARCHIVE #01</span>
                <strong className="home-mission-number">01</strong>
                <span className="home-card-title">첫 번째 기록</span>
                <span className="home-card-meta">본당 기록 복구 가능</span>
                <span className="home-card-status">탭하여 시작</span>
              </button>

              <section className="home-card home-card-progress reveal-soft">
                <div className="home-progress-ring" aria-hidden="true">
                  <span>0/7</span>
                </div>
                <p className="home-card-title">기록 복구율</p>
                <div className="home-progress-bar" aria-hidden="true">
                  <span />
                </div>
              </section>

              <section className="home-card home-card-signal reveal-soft">
                <p className="home-card-label">LAST SIGNAL FOUND</p>
                <p className="home-signal-message">
                  빛은 아직 완전히 사라지지 않았습니다.
                </p>
              </section>

              <section className="home-card home-card-archive reveal-soft">
                <div className="home-card-row">
                  <div>
                    <p className="home-card-label">ARCHIVE INDEX</p>
                    <p className="home-card-title">전체 아카이브</p>
                  </div>
                  <span className="home-archive-count">1 / 7</span>
                </div>
                <div className="home-archive-grid" aria-label="아카이브 잠금 상태">
                  {archives.map((archive) => (
                    <span
                      key={archive.id}
                      className={archive.locked ? 'is-locked' : 'is-unlocked'}
                    >
                      {archive.id}
                    </span>
                  ))}
                </div>
              </section>

              <section className="home-card home-card-mini reveal-soft">
                <p className="home-card-label">CURRENT TEAM</p>
                <p className="home-card-title">{selectedTeam ?? '탐색팀'}</p>
                <p className="home-card-meta">접속 유지 중</p>
              </section>

            </div>

            <nav className="home-bottom-nav reveal-soft" aria-label="하단 메뉴">
              <button type="button" className="is-active">홈</button>
              <button type="button">아카이브</button>
              <button type="button">진행현황</button>
              <button type="button">힌트</button>
            </nav>
          </section>
        )}

        {phase === 'step-intro' && (
          <section className="problem-screen problem-intro-screen">
            <button
              type="button"
              className="problem-home-button"
              onClick={() => setPhase('archive-home')}
            >
              HOME
            </button>

            <div className="problem-step-row reveal-soft">
              <p className="problem-kicker">STEP 1 / 7</p>
              <p className="problem-state">QR 신호 대기</p>
            </div>

            <div className="problem-main-copy reveal-soft">
              <h1>첫 번째 기록</h1>
              <p>
                현장에 숨겨진 QR 신호를 스캔하면
                <br />
                기록 복구가 시작됩니다.
              </p>
            </div>

            <button
              type="button"
              className="problem-next-zone"
              onClick={() => setPhase('step-story')}
              aria-label="첫 번째 기록 계속 보기"
            />
          </section>
        )}

        {phase === 'step-story' && (
          <section className="problem-screen problem-story-screen">
            <div className="problem-glow problem-glow-blue" aria-hidden="true" />
            <div className="problem-glow problem-glow-warm" aria-hidden="true" />
            <button
              type="button"
              className="problem-home-pill"
              onClick={() => setPhase('archive-home')}
            >
              HOME
            </button>

            <p className="problem-kicker problem-floating-kicker">ARCHIVE #01</p>

            <div className="problem-story-copy reveal-soft">
              <p>"...처음 빛이 사라졌을 때,</p>
              <p>아무도 그것을 이상하게 생각하지 않았다."</p>
              <p>"빛은 조용히 사라졌다."</p>
            </div>

            <div className="problem-bottom-row">
              <div>
                <p className="problem-tip">암호화된 신호를 해독하십시오.</p>
                <div className="problem-progress" aria-label="진행 1/7">
                  {archives.map((archive) => (
                    <span key={`story-progress-${archive.id}`} className={archive.id === '01' ? 'is-active' : ''} />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="problem-pill-button"
                onClick={() => setPhase('step-puzzle')}
              >
                암호 입력
              </button>
            </div>
          </section>
        )}

        {phase === 'step-puzzle' && (
          <section className="problem-screen problem-puzzle-screen">
            <div className="problem-glow problem-glow-blue" aria-hidden="true" />
            <div className="problem-glow problem-glow-warm" aria-hidden="true" />
            <button
              type="button"
              className="problem-home-pill"
              onClick={() => setPhase('archive-home')}
            >
              HOME
            </button>

            <p className="problem-kicker problem-floating-kicker">ENCRYPTED RECORD</p>

            <div className="problem-puzzle-copy reveal-soft">
              <h1>
                복구 코드를
                <br />
                입력하십시오.
              </h1>
              <label className="problem-code-field">
                <span>RECOVERY CODE</span>
                <input
                  value={recoveryCode}
                  onChange={(event) => setRecoveryCode(event.target.value)}
                  aria-label="복구 코드"
                />
              </label>
            </div>

            <div className="problem-bottom-row">
              <div>
                <p className="problem-tip">Tip. 현장 퍼즐의 정답이 기록을 밝힙니다.</p>
                <div className="problem-progress" aria-label="진행 1/7">
                  {archives.map((archive) => (
                    <span key={`puzzle-progress-${archive.id}`} className={archive.id === '01' ? 'is-active' : ''} />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="problem-pill-button is-bright"
                onClick={() => setPhase('step-restored')}
              >
                복구
              </button>
            </div>
          </section>
        )}

        {phase === 'step-restored' && (
          <section className="problem-screen problem-restored-screen">
            <div className="problem-glow problem-glow-blue" aria-hidden="true" />
            <div className="problem-glow problem-glow-warm" aria-hidden="true" />

            <div className="problem-restored-header reveal-soft">
              <p className="problem-kicker is-restored">ARCHIVE #01 RESTORED</p>
              <span>1/7</span>
            </div>

            <div className="problem-restored-copy reveal-soft">
              <h1>
                기록이
                <br />
                복구되었습니다.
              </h1>
              <div className="problem-hint-box">
                <p>
                  기록은 사람들이 가장 많이 지나가지만,
                  <br />
                  아무도 기억하지 않는 곳에 숨겨져 있다.
                </p>
              </div>
            </div>

            <div className="problem-bottom-row">
              <div className="problem-progress" aria-label="진행 1/7">
                {archives.map((archive) => (
                  <span key={`restored-progress-${archive.id}`} className={archive.id === '01' ? 'is-active' : ''} />
                ))}
              </div>
              <button
                type="button"
                className="problem-pill-button is-bright"
                onClick={() => setPhase('archive-home')}
              >
                다음 신호
              </button>
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

function App() {
  const isAdminRoute = window.location.pathname === '/admin'

  return isAdminRoute ? <AdminDashboard /> : <OnboardingApp />
}

export default App
