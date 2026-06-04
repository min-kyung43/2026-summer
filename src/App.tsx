import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { useEffect, useRef, useState } from 'react'
import './App.css'
import { supabase, type TeamRecord } from './supabase'

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
const appSessionStorageKey = 'lost-light-app-session'
const adminUnlockStorageKey = 'lost-light-admin-unlocked'
const firstArchiveQrValue = 'ARCHIVE-01-NEXT'

type Phase =
  | 'story'
  | 'boot'
  | 'ready'
  | 'team-select'
  | 'archive-home'
  | 'archive-list'
  | 'hint-home'
  | 'archive-detail'
  | 'step-intro'
  | 'step-story'
  | 'step-puzzle'
  | 'step-restored'
type TeamOption = (typeof teamOptions)[number]
type AppSession = {
  phase: Phase
  storyIndex: number
  selectedTeam: TeamOption | null
  activeTeam: TeamRecord | null
  recoveryCode: string
}

const validPhases = new Set<Phase>([
  'story',
  'boot',
  'ready',
  'team-select',
  'archive-home',
  'archive-list',
  'hint-home',
  'archive-detail',
  'step-intro',
  'step-story',
  'step-puzzle',
  'step-restored',
])

function isTeamOption(value: unknown): value is TeamOption {
  return typeof value === 'string' && teamOptions.includes(value as TeamOption)
}

function loadStoredSession(): Partial<AppSession> {
  try {
    const storedSession = window.localStorage.getItem(appSessionStorageKey)

    if (!storedSession) {
      return {}
    }

    const parsedSession = JSON.parse(storedSession) as Partial<AppSession>

    return {
      phase: parsedSession.phase && validPhases.has(parsedSession.phase)
        ? parsedSession.phase
        : undefined,
      storyIndex: typeof parsedSession.storyIndex === 'number' ? parsedSession.storyIndex : undefined,
      selectedTeam: isTeamOption(parsedSession.selectedTeam) ? parsedSession.selectedTeam : null,
      activeTeam: parsedSession.activeTeam ?? null,
      recoveryCode: typeof parsedSession.recoveryCode === 'string' ? parsedSession.recoveryCode : '',
    }
  } catch {
    return {}
  }
}

function isAdminUnlocked() {
  try {
    return window.sessionStorage.getItem(adminUnlockStorageKey) === 'true'
  } catch {
    return false
  }
}

function getTeamCodeForOption(teamName: TeamOption) {
  const teamIndex = teamOptions.indexOf(teamName) + 1

  return `TEAM${String(teamIndex).padStart(2, '0')}`
}

function createFallbackTeamRecord(teamName: TeamOption): TeamRecord {
  const teamCode = getTeamCodeForOption(teamName)

  return {
    id: teamCode,
    team_name: teamName,
    team_code: teamCode,
    current_stage: 1,
    completed_count: 0,
    hint_count: 0,
    is_finished: false,
    started_at: new Date().toISOString(),
    finished_at: null,
  }
}

function createFallbackAdminTeams() {
  return teamOptions.map((teamName) => createFallbackTeamRecord(teamName))
}

function getStageId(stage: number) {
  return String(Math.max(1, Math.min(stage, archives.length))).padStart(2, '0')
}

function getArchiveByStage(stage: number) {
  return archives[Math.max(0, Math.min(stage - 1, archives.length - 1))]
}

function getNextArchiveByStage(stage: number) {
  return archives[Math.max(0, Math.min(stage, archives.length - 1))]
}

type AdminDashboardProps = {
  onBack: () => void
}

function AdminDashboard({ onBack }: AdminDashboardProps) {
  const adminUnlocked = isAdminUnlocked()
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [isLoadingTeams, setIsLoadingTeams] = useState(true)
  const [adminError, setAdminError] = useState('')

  useEffect(() => {
    if (!adminUnlocked) {
      setIsLoadingTeams(false)
      return
    }

    let isMounted = true

    async function loadTeams() {
      setIsLoadingTeams(true)
      const { data, error } = await supabase
        .from('teams')
        .select('id, team_name, team_code, current_stage, completed_count, hint_count, is_finished, started_at, finished_at')
        .order('team_code', { ascending: true })

      if (!isMounted) {
        return
      }

      if (error || !data || data.length === 0) {
        setAdminError('연결된 팀 데이터가 없어 기본 조별 보드를 표시합니다.')
        setTeams(createFallbackAdminTeams())
      } else {
        setAdminError('')
        setTeams(data)
      }

      setIsLoadingTeams(false)
    }

    void loadTeams()

    return () => {
      isMounted = false
    }
  }, [adminUnlocked])

  if (!adminUnlocked) {
    return (
      <main className="admin-shell">
        <section className="admin-panel admin-locked-panel">
          <button type="button" className="admin-back-button" onClick={onBack}>
            이전
          </button>
          <p className="admin-kicker">RESTRICTED ARCHIVE MONITOR</p>
          <h1 className="admin-title">접근 권한이 없습니다</h1>
          <p className="admin-locked-copy">
            관리자 인증을 거친 접속에서만 진행현황을 확인할 수 있습니다.
          </p>
        </section>
      </main>
    )
  }

  const activeTeams = teams.filter((row) => !row.is_finished).length
  const hintUsedTeams = teams.reduce((total, row) => total + row.hint_count, 0)
  const completedTeams = teams.filter((row) => row.is_finished).length

  return (
    <main className="admin-shell">
      <section className="admin-panel">
        <button type="button" className="admin-back-button" onClick={onBack}>
          이전
        </button>
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
            <strong>{teams.length}</strong>
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
          {adminError ? <p className="admin-table-message">{adminError}</p> : null}
          {isLoadingTeams ? <p className="admin-table-message">팀 목록을 불러오는 중입니다.</p> : null}
          <div className="admin-team-list" aria-label="팀별 진행 현황">
            {teams.map((row) => (
              <article className="admin-team-card" key={row.id}>
                <div className="admin-team-card-header">
                  <div>
                    <p className="admin-team-name">{row.team_name} - 진행 상황</p>
                    <p className="admin-stage">
                      {row.team_code} · 현재 기록 ARCHIVE #{getStageId(row.current_stage)}
                    </p>
                  </div>
                  <span className={`admin-status ${row.is_finished ? 'is-complete' : 'is-active'}`}>
                    {row.is_finished ? '완료' : '진행 중'}
                  </span>
                </div>
                <div className="admin-team-body">
                  <div className="admin-team-location">
                    <span>현재 위치</span>
                    <strong>{getArchiveByStage(row.current_stage).name}</strong>
                    <p className="admin-team-note">
                      다음 기록 · {row.is_finished ? '모든 기록 복구 완료' : getNextArchiveByStage(row.current_stage).name}
                    </p>
                  </div>
                  <div className="admin-team-progress">
                    <div className="admin-team-progress-track" aria-hidden="true">
                      <span
                        className="admin-team-progress-fill"
                        style={{ width: `${Math.max(14, Math.min(100, (row.completed_count / archives.length) * 100))}%` }}
                      />
                    </div>
                    <p className="admin-team-progress-copy">
                      진행 단계 {Math.min(row.current_stage, archives.length)} / {archives.length}
                    </p>
                  </div>
                </div>
                <div className="admin-team-metrics">
                  <div>
                    <span>복구된 기록</span>
                    <strong>{row.completed_count}</strong>
                  </div>
                  <div>
                    <span>힌트 사용</span>
                    <strong className={row.hint_count > 0 ? 'admin-hint-used' : 'admin-hint-none'}>
                      {row.hint_count}
                    </strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

type OnboardingAppProps = {
  onAdminOpen: () => void
}

function OnboardingApp({ onAdminOpen }: OnboardingAppProps) {
  const [storedSession] = useState(() => loadStoredSession())
  const [phase, setPhase] = useState<Phase>('story')
  const [storyIndex, setStoryIndex] = useState(0)
  const [visibleBootLines, setVisibleBootLines] = useState(0)
  const [selectedTeam, setSelectedTeam] = useState<TeamOption | null>(null)
  const [activeTeam, setActiveTeam] = useState<TeamRecord | null>(null)
  const [isTeamSelectLoading, setIsTeamSelectLoading] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState(storedSession.recoveryCode ?? '')
  const [, setSecretAdminTapCount] = useState(0)
  const [qrScannerStatus, setQrScannerStatus] = useState<'idle' | 'scanning' | 'found' | 'error'>(
    'idle',
  )
  const [qrScannerMessage, setQrScannerMessage] = useState('현장 QR 신호를 스캔해야 기록을 열 수 있습니다.')
  const qrVideoRef = useRef<HTMLVideoElement | null>(null)
  const qrScannerControlsRef = useRef<IScannerControls | null>(null)
  const secretAdminTapTimerRef = useRef<number | null>(null)

  useEffect(() => {
    window.localStorage.setItem(
      appSessionStorageKey,
      JSON.stringify({
        phase,
        storyIndex,
        selectedTeam,
        activeTeam,
        recoveryCode,
      } satisfies AppSession),
    )
  }, [activeTeam, phase, recoveryCode, selectedTeam, storyIndex])

  useEffect(() => {
    if (!activeTeam?.team_code) {
      return
    }

    let isMounted = true

    async function refreshTeam() {
      const { data, error } = await supabase
        .from('teams')
        .select('id, team_name, team_code, current_stage, completed_count, hint_count, is_finished, started_at, finished_at')
        .eq('team_code', activeTeam?.team_code)
        .maybeSingle()

      if (!isMounted || error || !data) {
        return
      }

      setActiveTeam(data)
    }

    void refreshTeam()

    return () => {
      isMounted = false
    }
  }, [activeTeam?.team_code])

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

  useEffect(() => {
    if (phase === 'step-intro') {
      setQrScannerStatus('idle')
      setQrScannerMessage('현장 QR 신호를 스캔해야 기록을 열 수 있습니다.')
    }
  }, [phase])

  useEffect(() => {
    if (phase === 'step-intro') {
      return
    }

    qrScannerControlsRef.current?.stop()
    qrScannerControlsRef.current = null

    if (qrVideoRef.current) {
      qrVideoRef.current.srcObject = null
    }
  }, [phase])

  useEffect(() => {
    return () => {
      if (secretAdminTapTimerRef.current !== null) {
        window.clearTimeout(secretAdminTapTimerRef.current)
      }

      qrScannerControlsRef.current?.stop()
    }
  }, [])

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

  const handleTeamSelect = async (teamName: TeamOption) => {
    const teamCode = getTeamCodeForOption(teamName)

    setIsTeamSelectLoading(true)
    setSelectedTeam(teamName)
    setActiveTeam(createFallbackTeamRecord(teamName))
    setPhase('archive-home')

    try {
      const { data } = await supabase
        .from('teams')
        .select('id, team_name, team_code, current_stage, completed_count, hint_count, is_finished, started_at, finished_at')
        .eq('team_code', teamCode)
        .maybeSingle()

      if (data) {
        setActiveTeam(data)
      }
    } finally {
      setIsTeamSelectLoading(false)
    }
  }

  const handleSecretAdminTap = () => {
    setSecretAdminTapCount((currentCount) => {
      const nextCount = currentCount + 1

      if (nextCount >= 3) {
        if (secretAdminTapTimerRef.current !== null) {
          window.clearTimeout(secretAdminTapTimerRef.current)
          secretAdminTapTimerRef.current = null
        }

        window.sessionStorage.setItem(adminUnlockStorageKey, 'true')
        onAdminOpen()
        return 0
      }

      if (secretAdminTapTimerRef.current !== null) {
        window.clearTimeout(secretAdminTapTimerRef.current)
      }

      secretAdminTapTimerRef.current = window.setTimeout(() => {
        setSecretAdminTapCount(0)
        secretAdminTapTimerRef.current = null
      }, 1200)

      return nextCount
    })
  }

  const handleArchiveOpen = (archiveId: string) => {
    if (archiveId === '01') {
      setQrScannerStatus('idle')
      setQrScannerMessage('현장 QR 신호를 스캔해야 기록을 열 수 있습니다.')
      setPhase('step-intro')
    }
  }

  const handleQrScanStart = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setQrScannerStatus('error')
      setQrScannerMessage('이 브라우저에서는 카메라 접근을 사용할 수 없습니다.')
      return
    }

    try {
      const video = qrVideoRef.current

      if (!video) {
        throw new Error('QR video element is not ready.')
      }

      qrScannerControlsRef.current?.stop()
      setQrScannerStatus('scanning')
      setQrScannerMessage('QR 신호를 찾고 있습니다.')

      const reader = new BrowserQRCodeReader()
      const controls = await reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        video,
        (result) => {
          if (!result || qrScannerControlsRef.current === null) {
            return
          }

          if (result.getText() !== firstArchiveQrValue) {
            setQrScannerStatus('error')
            setQrScannerMessage('본당 QR만 인식할 수 있습니다.')
            return
          }

          qrScannerControlsRef.current.stop()
          qrScannerControlsRef.current = null
          setQrScannerStatus('found')
          setQrScannerMessage('QR 신호가 확인되었습니다.')
          window.setTimeout(() => setPhase('step-story'), 500)
        }
      )

      qrScannerControlsRef.current = controls
    } catch {
      qrScannerControlsRef.current?.stop()
      qrScannerControlsRef.current = null
      setQrScannerStatus('error')
      setQrScannerMessage('카메라 권한을 허용한 뒤 다시 시도해주세요.')
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
                    disabled={isTeamSelectLoading}
                    onClick={() => handleTeamSelect(teamName)}
                  >
                    {isTeamSelectLoading ? '접속 중' : teamName}
                  </button>
                ))}
                <button
                  type="button"
                  className="team-option-button team-admin-secret"
                  disabled={isTeamSelectLoading}
                  onClick={handleSecretAdminTap}
                  aria-label="관리자 숨은 진입"
                />
              </div>
            </div>
          </section>
        )}

        {phase === 'archive-home' && (
          <section className="archive-screen archive-home-screen">
            <header className="home-header reveal-soft">
              <div>
                <p className="home-app-name">사라진 빛을 찾아서</p>
                <h1 className="home-title">접속이 복구되었습니다.</h1>
                <p className="home-subtitle">복구되지 않은 기록 7개</p>
              </div>
              <div className="home-actions" aria-label="빠른 메뉴">
                <button type="button" className="home-icon-button" aria-label="설정">
                  ·
                </button>
              </div>
            </header>

            <div className="home-card-grid">
              <section className="home-signal-message reveal-soft" aria-label="시스템 메시지">
                <p className="home-card-label">LAST SIGNAL FOUND</p>
                <p className="home-signal-copy">
                  "...빛은 아직 완전히 사라지지 않았다."
                </p>
              </section>

              <button
                type="button"
                className="home-card home-card-now reveal-soft"
                onClick={() => handleArchiveOpen('01')}
              >
                <div className="home-now-header">
                  <span className="home-card-label">CURRENT OBJECTIVE</span>
                  <span className="home-now-badge">조사 필요</span>
                </div>
                <div className="home-now-body">
                  <div>
                    <p className="home-now-location">현재 위치</p>
                    <h2 className="home-now-title">본당</h2>
                    <p className="home-now-description">
                      복구 가능한 기록이 발견되었습니다.
                    </p>
                  </div>
                </div>
                <span className="home-now-action">조사 시작</span>
              </button>

              <section className="home-card home-card-progress reveal-soft">
                <p className="home-card-label">RESTORED RECORDS</p>
                <p className="home-progress-value">
                  0 <span>/ 7</span>
                </p>
                <p className="home-card-title">복구된 기록</p>
                <div className="home-progress-bar" aria-hidden="true">
                  <span />
                </div>
              </section>

            </div>

            <nav className="home-bottom-nav reveal-soft" aria-label="하단 메뉴">
              <button type="button" className="is-active" onClick={() => setPhase('archive-home')}>홈</button>
              <button type="button" onClick={() => setPhase('archive-list')}>아카이브</button>
              <button type="button" onClick={() => setPhase('hint-home')}>힌트</button>
            </nav>
          </section>
        )}

        {phase === 'archive-list' && (
          <section className="archive-screen archive-home-screen archive-tab-screen">
            <header className="home-header reveal-soft">
              <div>
                <p className="home-app-name">RESTORED ARCHIVES</p>
                <h1 className="home-title">아카이브</h1>
                <p className="home-subtitle">복구 가능한 기록을 확인하세요.</p>
              </div>
            </header>

            <div className="archive-list">
              {archives.map((archive) => (
                <button
                  key={archive.id}
                  type="button"
                  className={`archive-card ${archive.locked ? 'is-locked' : 'is-unlocked'}`}
                  disabled={archive.locked}
                  onClick={() => handleArchiveOpen(archive.id)}
                >
                  <div className="archive-card-header">
                    <span className="archive-card-id">ARCHIVE #{archive.id}</span>
                    <span className="archive-lock">{archive.locked ? 'LOCKED' : 'OPEN'}</span>
                  </div>
                  <p className="archive-card-title">
                    {archive.locked ? '기록 복구 필요' : archive.name}
                  </p>
                  <p className="archive-card-status">
                    {archive.locked ? '아직 신호가 잠겨 있습니다.' : '첫 번째 조사를 시작할 수 있습니다.'}
                  </p>
                </button>
              ))}
            </div>

            <nav className="home-bottom-nav reveal-soft" aria-label="하단 메뉴">
              <button type="button" onClick={() => setPhase('archive-home')}>홈</button>
              <button type="button" className="is-active" onClick={() => setPhase('archive-list')}>아카이브</button>
              <button type="button" onClick={() => setPhase('hint-home')}>힌트</button>
            </nav>
          </section>
        )}

        {phase === 'hint-home' && (
          <section className="archive-screen archive-home-screen hint-tab-screen">
            <header className="home-header reveal-soft">
              <div>
                <p className="home-app-name">SIGNAL HINTS</p>
                <h1 className="home-title">힌트</h1>
                <p className="home-subtitle">막혔을 때만 조심스럽게 열어보세요.</p>
              </div>
            </header>

            <div className="hint-card-list">
              <section className="home-card hint-card reveal-soft">
                <p className="home-card-label">CURRENT HINT</p>
                <h2 className="hint-card-title">본당 신호</h2>
                <p className="hint-card-copy">
                  사람들이 가장 많이 지나가지만, 아무도 오래 바라보지 않는 곳을 확인하세요.
                </p>
              </section>

              <section className="home-card hint-card reveal-soft">
                <p className="home-card-label">HINT USAGE</p>
                <p className="home-progress-value">
                  {activeTeam?.hint_count ?? 0}
                </p>
                <p className="home-card-title">사용한 힌트</p>
              </section>

              <button
                type="button"
                className="home-card hint-start-card reveal-soft"
                onClick={() => handleArchiveOpen('01')}
              >
                <span className="home-card-label">NEXT ACTION</span>
                <span className="hint-card-title">첫 번째 조사로 이동</span>
                <span className="hint-card-copy">QR 신호를 스캔하고 기록 복구를 시작합니다.</span>
              </button>
            </div>

            <nav className="home-bottom-nav reveal-soft" aria-label="하단 메뉴">
              <button type="button" onClick={() => setPhase('archive-home')}>홈</button>
              <button type="button" onClick={() => setPhase('archive-list')}>아카이브</button>
              <button type="button" className="is-active" onClick={() => setPhase('hint-home')}>힌트</button>
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

            <div className="qr-scan-panel reveal-soft">
              <div className={`qr-viewfinder is-${qrScannerStatus}`}>
                <video ref={qrVideoRef} muted playsInline aria-label="QR 스캔 카메라 화면" />
                <span aria-hidden="true" />
              </div>
              <p className="qr-scan-message">{qrScannerMessage}</p>
              <button
                type="button"
                className="problem-pill-button qr-scan-button"
                onClick={handleQrScanStart}
                disabled={qrScannerStatus === 'scanning' || qrScannerStatus === 'found'}
              >
                {qrScannerStatus === 'scanning'
                  ? '스캔 중'
                  : qrScannerStatus === 'found'
                    ? '신호 확인'
                    : 'QR 스캔 시작'}
              </button>
            </div>
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
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const handleAdminOpen = () => {
    if (window.location.pathname !== '/admin') {
      window.history.pushState(null, '', '/admin')
    }

    setPathname('/admin')
  }

  const handleAdminBack = () => {
    if (window.history.length > 1) {
      window.history.back()
      window.setTimeout(() => {
        if (window.location.pathname === '/admin') {
          window.history.pushState(null, '', '/')
          setPathname('/')
        }
      }, 120)
      return
    }

    window.history.pushState(null, '', '/')
    setPathname('/')
  }

  const isAdminRoute = pathname === '/admin'

  return isAdminRoute ? (
    <AdminDashboard onBack={handleAdminBack} />
  ) : (
    <OnboardingApp onAdminOpen={handleAdminOpen} />
  )
}

export default App
