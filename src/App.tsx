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
  { id: '02', name: '수영장', status: '잠금', locked: true },
  { id: '03', name: '식당', status: '잠금', locked: true },
  { id: '04', name: '소예배실', status: '잠금', locked: true },
  { id: '05', name: '2층 복도', status: '잠금', locked: true },
  { id: '06', name: '3층', status: '잠금', locked: true },
  { id: '07', name: '야외캠핑장', status: '잠금', locked: true },
] as const

const teamOptions = ['1조', '2조', '3조', '4조', '5조'] as const
const teamCodes = teamOptions.map((_, index) => `TEAM${String(index + 1).padStart(2, '0')}`)
const finalDestination = '본당'
const appSessionStorageKey = 'lost-light-app-session'
const adminUnlockStorageKey = 'lost-light-admin-unlocked'
const gameDurationMs = 60 * 60 * 1000
const puzzleLockMs = 60 * 1000
const maxWrongAttempts = 3
const maxHintCount = 3
const handSignalAnswer = '8'
const circleCoordinateAnswer = '19767'

const problemStages = [
  {
    archiveId: '01',
    title: '오늘의 날짜는?',
    intro: [
      '탐색팀은 본당에 남은 첫 번째 신호 앞에 선다.',
      '기록의 날짜 정보는 손상되었고, 단 하나의 문장만 남아 있다.',
      '오늘이 어떤 날인지 알아내야 첫 번째 기록을 복구할 수 있다.',
    ],
    story: [
      '첫 번째 기록이 복구되었다.',
      '그러나 기록의 일부가 손상되어 정확한 날짜를 알 수 없다.',
      '남겨진 문장은 단 하나.',
      '"어제가 내일이었으면 좋겠다. 그럼 오늘은 금요일일 텐데..."',
    ],
    questionLabel: '문제',
    question: '오늘은 무슨 요일인가?',
    answer: '일요일',
    answers: ['일요일', '일'],
    clueTitle: '문제를 풀었을 때 얻는 단서',
    clue: '돌고 돌아 다시 시작되는 곳. 모든 여정의 시작이자 마지막.',
    actionText: 'QR 스캔 시작',
    tip: '본당 입구에 남은 신호를 스캔하십시오.',
    state: 'QR 신호 대기',
    resultLabel: '첫 번째 기록',
    puzzleType: 'dateRiddle',
  },
  {
    archiveId: '02',
    title: '침묵의 수신호',
    intro: [
      '두 번째 기록에는 말 대신 수신호가 남겨져 있다.',
      '손짓들 사이의 관계를 이해해야만 숨겨진 숫자를 읽어낼 수 있다.',
      '마지막 물음표에 들어갈 값을 찾아야 기록이 열린다.',
    ],
    story: [
      '두 번째 기록에는 말 대신 수신호가 남겨져 있다.',
      '손짓들 사이의 관계를 이해해야만',
      '숨겨진 숫자를 읽어낼 수 있다.',
    ],
    questionLabel: '문제',
    question: '마지막 물음표에 들어갈 숫자를 구하시오.',
    answer: handSignalAnswer,
    clueTitle: '문제를 풀었을 때 얻는 단서',
    clue: '잔잔한 물결이 빛을 반사하고 있다. 희미한 메아리만이 남아 있다.',
    actionText: 'QR 스캔 시작',
    tip: '현장 QR 신호를 스캔하십시오.',
    hint: '디지털 숫자를 떠올려 보시오.',
    state: 'QR 신호 대기',
    resultLabel: '둘째 기록',
    puzzleType: 'handSignals',
  },
  {
    archiveId: '03',
    title: '검은 원의 좌표',
    intro: [
      '암호화된 숫자 배열이 발견되었다.',
      '흰 원은 숫자가 맞음을, 검은 원은 숫자와 위치가 모두 맞음을 의미한다.',
      '모든 단서를 조합하여 완전한 암호를 찾아야 한다.',
    ],
    story: [
      '암호화된 숫자 배열이 발견되었다.',
      '흰 원은 숫자가 맞음을 의미한다.',
      '검은 원은 숫자와 위치가 모두 맞음을 의미한다.',
      '모든 단서를 조합하여 완전한 암호를 찾아야 한다.',
    ],
    questionLabel: '문제',
    question: '검은 원 5개가 완성되는 5자리 암호를 입력하십시오.',
    answer: circleCoordinateAnswer,
    clueTitle: '문제를 풀었을 때 얻는 단서',
    clue: '따뜻한 온기와 사람들의 흔적이 남아 있는 곳. 수많은 만남이 지나간 장소.',
    actionText: 'QR 스캔 시작',
    tip: '현장 QR 신호를 스캔하십시오.',
    hint: '각 행에서 검은 원과 흰 원의 의미를 분석하시오.',
    state: 'QR 신호 대기',
    resultLabel: '셋째 기록',
    puzzleType: 'circleCoordinate',
  },
  {
    archiveId: '04',
    title: '성경 암호 해독',
    intro: [
      '오래된 두루마리 속에는 숫자와 구절이 함께 봉인되어 있다.',
      '성경 속 숫자를 모아 암호 코드를 만들고 마지막 말씀을 복구해야 한다.',
      '세 번의 해독을 끝내야 기록이 열린다.',
    ],
    story: [
      '오래된 두루마리 속에는',
      '네 개의 숫자와 손상된 구절이 함께 보존되어 있다.',
      '말씀 속 숫자를 따라가면',
      '감추어진 마지막 이름이 드러난다.',
    ],
    questionLabel: '문제',
    question: '성경 구절에서 A, B, C, D 값을 찾아 순서대로 입력하십시오.',
    answer: '여호와이스라엘',
    answers: ['여호와이스라엘'],
    clueTitle: '문제를 풀었을 때 얻는 단서',
    clue: '오랫동안 보존된 말씀과 기도가 잠들어 있는 곳. 조용함 속에서 기록은 더욱 선명해진다.',
    actionText: 'QR 스캔 시작',
    tip: '현장 QR 신호를 스캔하십시오.',
    hint: '주변에 성경책을 찾아보시오.',
    state: 'QR 신호 대기',
    resultLabel: '넷째 기록',
    puzzleType: 'bibleCipher',
  },
  {
    archiveId: '05',
    title: '매직 다이어리',
    intro: [
      '낡은 다이어리에는 요일마다 숫자가 기록되어 있다.',
      '기록자는 일정한 규칙을 알고 있었지만 그 규칙은 오랫동안 잊혀졌다.',
      '요일 옆 숫자의 의미를 복원해야 한다.',
    ],
    story: [
      '낡은 다이어리에는 요일마다 숫자가 기록되어 있다.',
      '기록자는 일정한 규칙을 알고 있었지만',
      '그 규칙은 오랫동안 잊혀졌다.',
    ],
    questionLabel: '문제',
    question: 'MON = 3, TUE = 5, WED = 4, THU = ?',
    answer: '6',
    clueTitle: '문제를 풀었을 때 얻는 단서',
    clue: '누군가 지나간 발자국과 작은 메아리가 남아 있다. 잠시 머물렀다 사라지는 공간.',
    actionText: 'QR 스캔 시작',
    tip: '현장 QR 신호를 스캔하십시오.',
    hint: '한붓그리기를 떠올려 보시오.',
    state: 'QR 신호 대기',
    resultLabel: '다섯째 기록',
    puzzleType: 'weekday',
  },
  {
    archiveId: '06',
    title: '알파벳 조합하기',
    intro: [
      '손상된 기록 속에는 흩어진 문자만 남아 있다.',
      '문자들은 하나의 의미를 가지고 있었지만 시간이 흐르며 순서가 사라졌다.',
      '흩어진 알파벳을 모두 사용해 하나의 단어를 완성해야 한다.',
    ],
    story: [
      '손상된 기록 속에는 흩어진 문자만 남아 있다.',
      '문자들은 하나의 의미를 가지고 있었지만',
      '시간이 흐르며 순서가 사라졌다.',
    ],
    questionLabel: '문제',
    question: '주어진 알파벳들을 모두 사용하여 하나의 단어를 완성하시오.',
    answer: 'NEW DOOR',
    answers: ['NEW DOOR', 'NEWDOOR'],
    clueTitle: '문제를 풀었을 때 얻는 단서',
    clue: '가장 높은 곳에서 희미한 빛이 감지된다. 아직 완전히 꺼지지 않은 흔적.',
    actionText: 'QR 스캔 시작',
    tip: '현장 QR 신호를 스캔하십시오.',
    hint: "'새로운 문'",
    state: 'QR 신호 대기',
    resultLabel: '여섯째 기록',
    puzzleType: 'alphabetMix',
  },
  {
    archiveId: '07',
    title: '마지막 이름',
    intro: [
      '마침내 마지막 기록이 발견되었다.',
      '기록은 뒤섞여 있었고 문자의 순서를 바로잡아야 한다.',
      '올바른 이름을 복구하면 빛의 진실을 확인할 수 있다.',
    ],
    story: [
      '마침내 마지막 기록이 발견되었다.',
      '그러나 기록은 뒤섞여 있었고',
      '문자의 순서를 바로잡아야만',
      '빛의 진실을 확인할 수 있다.',
    ],
    questionLabel: '최종 문제',
    question: '상죄효겅. 각 자음과 모음을 회전하지 않고 이동시켜 올바른 단어를 완성하시오.',
    answer: '장성교회',
    clueTitle: '문제를 풀었을 때 얻는 단서',
    clue: '별빛 아래 남겨진 마지막 흔적. 모든 기록이 끝나는 장소.',
    actionText: 'QR 스캔 시작',
    tip: '현장 QR 신호를 스캔하십시오.',
    hint: '애너그램을 생각해 보시오.',
    state: 'QR 신호 대기',
    resultLabel: '마지막 기록',
    puzzleType: 'koreanAnagram',
  },
] as const

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
type ArchiveId = (typeof archives)[number]['id']
type AppSession = {
  phase: Phase
  storyIndex: number
  challengeIndex: number
  selectedTeam: TeamOption | null
  activeTeam: TeamRecord | null
  recoveryCode: string
  bibleStep: number
  gameStartedAt: number | null
  wrongAttempts: Record<string, number>
  lockedUntil: Record<string, number>
  revealedHints: Record<string, boolean>
}

const teamArchiveOrders = {
  '1조': ['01', '02', '03', '04', '05', '06', '07'],
  '2조': ['01', '03', '04', '05', '06', '07', '02'],
  '3조': ['01', '04', '05', '06', '07', '02', '03'],
  '4조': ['01', '05', '06', '07', '02', '03', '04'],
  '5조': ['01', '06', '07', '02', '03', '04', '05'],
} satisfies Record<TeamOption, readonly ArchiveId[]>

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

function isNumberRecord(value: unknown): value is Record<string, number> {
  return Boolean(value) && typeof value === 'object'
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return Boolean(value) && typeof value === 'object'
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
      challengeIndex: typeof parsedSession.challengeIndex === 'number' ? parsedSession.challengeIndex : undefined,
      selectedTeam: isTeamOption(parsedSession.selectedTeam) ? parsedSession.selectedTeam : null,
      activeTeam: parsedSession.activeTeam ?? null,
      recoveryCode: typeof parsedSession.recoveryCode === 'string' ? parsedSession.recoveryCode : '',
      bibleStep: typeof parsedSession.bibleStep === 'number' ? parsedSession.bibleStep : 1,
      gameStartedAt: typeof parsedSession.gameStartedAt === 'number' ? parsedSession.gameStartedAt : null,
      wrongAttempts: isNumberRecord(parsedSession.wrongAttempts) ? parsedSession.wrongAttempts : {},
      lockedUntil: isNumberRecord(parsedSession.lockedUntil) ? parsedSession.lockedUntil : {},
      revealedHints: isBooleanRecord(parsedSession.revealedHints) ? parsedSession.revealedHints : {},
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

function getTeamOptionFromRecord(team: Pick<TeamRecord, 'team_name' | 'team_code'>): TeamOption {
  if (isTeamOption(team.team_name)) {
    return team.team_name
  }

  return teamOptions.find((teamName) => getTeamCodeForOption(teamName) === team.team_code) ?? '1조'
}

function getTeamArchiveOrder(teamName: TeamOption | null | undefined) {
  return teamArchiveOrders[teamName ?? '1조']
}

function getArchiveById(archiveId: string) {
  return archives.find((archive) => archive.id === archiveId) ?? archives[0]
}

function getProblemByArchiveId(archiveId: string) {
  return problemStages.find((stage) => stage.archiveId === archiveId) ?? problemStages[0]
}

function getTeamArchiveByStage(stage: number, teamName: TeamOption | null | undefined) {
  const order = getTeamArchiveOrder(teamName)
  const archiveId = order[Math.max(0, Math.min(stage - 1, order.length - 1))]

  return getArchiveById(archiveId)
}

function getTeamProblemByStage(stage: number, teamName: TeamOption | null | undefined) {
  return getProblemByArchiveId(getTeamArchiveByStage(stage, teamName).id)
}

function getNextTeamArchiveByStage(stage: number, teamName: TeamOption | null | undefined) {
  const order = getTeamArchiveOrder(teamName)
  const archiveId = order[Math.max(0, Math.min(stage, order.length - 1))]

  return getArchiveById(archiveId)
}

function getArchiveQrValue(archiveId: string) {
  return `ARCHIVE-${archiveId}-NEXT`
}

function getProblemAnswers(problem: (typeof problemStages)[number]) {
  return 'answers' in problem ? problem.answers : [problem.answer]
}

function getBibleStepAnswers(step: number) {
  if (step === 1) {
    return ['24077']
  }

  if (step === 2) {
    return ['35']
  }

  return ['여호와이스라엘']
}

function getBibleStepQuestion(step: number) {
  if (step === 1) {
    return '성경 구절에서 A, B, C, D 값을 찾아 순서대로 입력하십시오.'
  }

  if (step === 2) {
    return '최종 암호 코드 = (B-A×C)+D+A 값을 입력하십시오.'
  }

  return '예레미야 35장 19절의 빈칸 [ ? ]에 들어갈 말씀을 띄어쓰기 없이 입력하십시오.'
}

function getTeamStageByArchiveId(archiveId: string, teamName: TeamOption | null | undefined) {
  const stageIndex = getTeamArchiveOrder(teamName).indexOf(archiveId as ArchiveId)

  return stageIndex >= 0 ? stageIndex + 1 : null
}

function normalizeAnswer(text: string) {
  return text
    .toLowerCase()
    .replace(/[\s·,./'"“”‘’?!\-]/g, '')
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
        const visibleTeams = data.filter((row) => teamCodes.includes(row.team_code))

        setAdminError(visibleTeams.length === 0 ? '연결된 팀 데이터가 없어 기본 조별 보드를 표시합니다.' : '')
        setTeams(visibleTeams.length === 0 ? createFallbackAdminTeams() : visibleTeams)
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
                      {row.team_code} · 현재 기록 ARCHIVE #{getTeamArchiveByStage(row.current_stage, getTeamOptionFromRecord(row)).id}
                    </p>
                  </div>
                  <span className={`admin-status ${row.is_finished ? 'is-complete' : 'is-active'}`}>
                    {row.is_finished ? '완료' : '진행 중'}
                  </span>
                </div>
                <div className="admin-team-body">
                  <div className="admin-team-location">
                    <span>현재 위치</span>
                    <strong>{row.is_finished ? finalDestination : getTeamArchiveByStage(row.current_stage, getTeamOptionFromRecord(row)).name}</strong>
                    <p className="admin-team-note">
                      다음 기록 · {row.is_finished ? '본당 도착' : getNextTeamArchiveByStage(row.current_stage, getTeamOptionFromRecord(row)).name}
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
  const [phase, setPhase] = useState<Phase>(storedSession.phase ?? 'story')
  const [storyIndex, setStoryIndex] = useState(storedSession.storyIndex ?? 0)
  const [challengeIndex, setChallengeIndex] = useState(
    Math.max(1, Math.min(storedSession.challengeIndex ?? 1, problemStages.length)),
  )
  const [visibleBootLines, setVisibleBootLines] = useState(0)
  const [selectedTeam, setSelectedTeam] = useState<TeamOption | null>(storedSession.selectedTeam ?? null)
  const [activeTeam, setActiveTeam] = useState<TeamRecord | null>(storedSession.activeTeam ?? null)
  const [isTeamSelectLoading, setIsTeamSelectLoading] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState(storedSession.recoveryCode ?? '')
  const [bibleStep, setBibleStep] = useState(Math.max(1, Math.min(storedSession.bibleStep ?? 1, 3)))
  const [puzzleFeedback, setPuzzleFeedback] = useState('')
  const [gameStartedAt, setGameStartedAt] = useState<number | null>(storedSession.gameStartedAt ?? null)
  const [wrongAttempts, setWrongAttempts] = useState<Record<string, number>>(storedSession.wrongAttempts ?? {})
  const [lockedUntil, setLockedUntil] = useState<Record<string, number>>(storedSession.lockedUntil ?? {})
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>(storedSession.revealedHints ?? {})
  const [now, setNow] = useState(() => Date.now())
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [, setSecretAdminTapCount] = useState(0)
  const [qrScannerStatus, setQrScannerStatus] = useState<'idle' | 'scanning' | 'found' | 'error'>(
    'idle',
  )
  const [qrScannerMessage, setQrScannerMessage] = useState('')
  const qrVideoRef = useRef<HTMLVideoElement | null>(null)
  const qrScannerControlsRef = useRef<IScannerControls | null>(null)
  const secretAdminTapTimerRef = useRef<number | null>(null)
  const qrAdminBypassTimerRef = useRef<number | null>(null)
  const qrAdminBypassTriggeredRef = useRef(false)

  useEffect(() => {
    window.localStorage.setItem(
      appSessionStorageKey,
      JSON.stringify({
        phase,
        storyIndex,
        challengeIndex,
        selectedTeam,
        activeTeam,
        recoveryCode,
        bibleStep,
        gameStartedAt,
        wrongAttempts,
        lockedUntil,
        revealedHints,
      } satisfies AppSession),
    )
  }, [activeTeam, bibleStep, challengeIndex, gameStartedAt, lockedUntil, phase, recoveryCode, revealedHints, selectedTeam, storyIndex, wrongAttempts])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

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
      setQrScannerMessage('')
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
      if (qrAdminBypassTimerRef.current !== null) {
        window.clearTimeout(qrAdminBypassTimerRef.current)
      }
    }
  }, [])

  const teamForOrder = selectedTeam ?? (activeTeam ? getTeamOptionFromRecord(activeTeam) : null)
  const orderedArchives = getTeamArchiveOrder(teamForOrder).map((archiveId) => getArchiveById(archiveId))
  const currentProblem = getTeamProblemByStage(challengeIndex, teamForOrder)
  const currentArchive = getTeamArchiveByStage(challengeIndex, teamForOrder)
  const isCurrentBibleCipher = 'puzzleType' in currentProblem && currentProblem.puzzleType === 'bibleCipher'
  const currentQuestion = isCurrentBibleCipher ? getBibleStepQuestion(bibleStep) : currentProblem.question
  const hasCompletedJourney = Boolean(activeTeam?.is_finished || (activeTeam?.completed_count ?? 0) >= problemStages.length)
  const restoredRecordCount = Math.min(
    problemStages.length,
    Math.max(activeTeam?.completed_count ?? 0, challengeIndex - 1),
  )
  const hasReachedHintLimit = (activeTeam?.hint_count ?? 0) >= maxHintCount
  const nextArchive = challengeIndex >= problemStages.length
    ? null
    : getNextTeamArchiveByStage(challengeIndex, teamForOrder)
  const currentLockedUntil = lockedUntil[currentProblem.archiveId] ?? 0
  const isPuzzleLocked = currentLockedUntil > now
  const puzzleLockRemaining = Math.max(0, Math.ceil((currentLockedUntil - now) / 1000))
  const gameTimeRemaining = gameStartedAt
    ? Math.max(0, gameDurationMs - (now - gameStartedAt))
    : null
  const gameTimerLabel = gameTimeRemaining === null
    ? null
    : `${String(Math.floor(gameTimeRemaining / 60000)).padStart(2, '0')}:${String(Math.floor((gameTimeRemaining % 60000) / 1000)).padStart(2, '0')}`

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

  const handleOpenResetDialog = () => {
    setIsResetDialogOpen(true)
  }

  const handleCancelReset = () => {
    setIsResetDialogOpen(false)
  }

  const handleConfirmReset = () => {
    window.localStorage.removeItem(appSessionStorageKey)
    setPhase('story')
    setStoryIndex(0)
    setChallengeIndex(1)
    setSelectedTeam(null)
    setActiveTeam(null)
    setRecoveryCode('')
    setBibleStep(1)
    setPuzzleFeedback('')
    setGameStartedAt(null)
    setWrongAttempts({})
    setLockedUntil({})
    setRevealedHints({})
    setVisibleBootLines(0)
    setQrScannerStatus('idle')
    setQrScannerMessage('')
    setIsTeamSelectLoading(false)
    setIsResetDialogOpen(false)
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
    const nextChallengeIndex = getTeamStageByArchiveId(archiveId, teamForOrder)

    if (nextChallengeIndex === null) {
      return
    }

    setChallengeIndex(Math.max(1, Math.min(nextChallengeIndex, problemStages.length)))
    setRecoveryCode('')
    setBibleStep(1)
    setPuzzleFeedback('')
    setQrScannerStatus('idle')
    setQrScannerMessage('')
    setPhase('step-intro')
  }

  const handlePuzzleSubmit = async () => {
    if (isPuzzleLocked) {
      setPuzzleFeedback(`기록 접근이 잠시 제한되었습니다. ${puzzleLockRemaining}초 후 다시 시도하십시오.`)
      return
    }

    const isBibleCipher = 'puzzleType' in currentProblem && currentProblem.puzzleType === 'bibleCipher'
    const expectedAnswers = isBibleCipher ? getBibleStepAnswers(bibleStep) : getProblemAnswers(currentProblem)
    const isCorrect = expectedAnswers.some(
      (answer) => normalizeAnswer(recoveryCode) === normalizeAnswer(answer),
    )

    if (!isCorrect) {
      const nextAttemptCount = (wrongAttempts[currentProblem.archiveId] ?? 0) + 1

      if (nextAttemptCount >= maxWrongAttempts) {
        setWrongAttempts((current) => ({
          ...current,
          [currentProblem.archiveId]: 0,
        }))
        setLockedUntil((current) => ({
          ...current,
          [currentProblem.archiveId]: Date.now() + puzzleLockMs,
        }))
        setPuzzleFeedback('기록 복구 실패.\n암호를 다시 해독하십시오.\n1분 동안 입력이 제한됩니다.')
        return
      }

      setWrongAttempts((current) => ({
        ...current,
        [currentProblem.archiveId]: nextAttemptCount,
      }))
      setPuzzleFeedback(`기록 복구 실패.\n암호를 다시 해독하십시오. (${nextAttemptCount}/${maxWrongAttempts})`)
      return
    }

    setPuzzleFeedback('기록 복구 완료.\n신호가 안정화되었습니다.')
    setWrongAttempts((current) => ({
      ...current,
      [currentProblem.archiveId]: 0,
    }))
    setLockedUntil((current) => ({
      ...current,
      [currentProblem.archiveId]: 0,
    }))

    if (isBibleCipher && bibleStep < 3) {
      setPuzzleFeedback('정답입니다.\n다음 해독 단계가 열렸습니다.')
      setRecoveryCode('')
      window.setTimeout(() => {
        setBibleStep((current) => Math.min(3, current + 1))
        setPuzzleFeedback('')
      }, 450)
      return
    }

    if (challengeIndex === 1 && gameStartedAt === null) {
      setGameStartedAt(Date.now())
    }

    const nextStage = Math.min(problemStages.length, challengeIndex + 1)
    const nextCompletedCount = Math.min(problemStages.length, Math.max(activeTeam?.completed_count ?? 0, challengeIndex))
    const nextIsFinished = challengeIndex >= problemStages.length

    if (activeTeam?.team_code) {
      const nextTeam = {
        ...activeTeam,
        current_stage: nextStage,
        completed_count: nextCompletedCount,
        is_finished: nextIsFinished,
        finished_at: nextIsFinished ? new Date().toISOString() : activeTeam.finished_at,
      }

      setActiveTeam(nextTeam)

      await supabase
        .from('teams')
        .update({
          current_stage: nextStage,
          completed_count: nextCompletedCount,
          is_finished: nextIsFinished,
          finished_at: nextTeam.finished_at,
        })
        .eq('team_code', activeTeam.team_code)
    }

    window.setTimeout(() => setPhase('step-restored'), 450)
  }

  const handleNextSignal = () => {
    if (challengeIndex >= problemStages.length) {
      setPhase('archive-home')
      return
    }

    setChallengeIndex((current) => Math.min(problemStages.length, current + 1))
    setRecoveryCode('')
    setBibleStep(1)
    setPuzzleFeedback('')
    setQrScannerStatus('idle')
    setQrScannerMessage('')
    setPhase('archive-home')
  }

  const handleRevealHint = async () => {
    if (!('hint' in currentProblem) || !currentProblem.hint) {
      return
    }

    if (revealedHints[currentProblem.archiveId]) {
      return
    }

    if (hasReachedHintLimit) {
      setPuzzleFeedback(`힌트는 최대 ${maxHintCount}번까지만 사용할 수 있습니다.`)
      return
    }

    setRevealedHints((current) => ({
      ...current,
      [currentProblem.archiveId]: true,
    }))

    if (!activeTeam?.team_code) {
      return
    }

    const nextHintCount = (activeTeam.hint_count ?? 0) + 1
    setActiveTeam({
      ...activeTeam,
      hint_count: nextHintCount,
    })

    await supabase
      .from('teams')
      .update({ hint_count: nextHintCount })
      .eq('team_code', activeTeam.team_code)
  }

  const handleQrScanStart = async () => {
    if (qrAdminBypassTriggeredRef.current) {
      qrAdminBypassTriggeredRef.current = false
      return
    }

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

          if (result.getText() !== getArchiveQrValue(currentProblem.archiveId)) {
            setQrScannerStatus('error')
            setQrScannerMessage(`${currentArchive.name} QR만 인식할 수 있습니다.`)
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

  const handleQrAdminBypassStart = () => {
    if (phase !== 'step-intro' || qrScannerStatus === 'scanning' || qrScannerStatus === 'found') {
      return
    }

    if (qrAdminBypassTimerRef.current !== null) {
      window.clearTimeout(qrAdminBypassTimerRef.current)
    }

    qrAdminBypassTriggeredRef.current = false
    qrAdminBypassTimerRef.current = window.setTimeout(() => {
      qrAdminBypassTimerRef.current = null
      qrAdminBypassTriggeredRef.current = true
      qrScannerControlsRef.current?.stop()
      qrScannerControlsRef.current = null
      setQrScannerStatus('found')
      setQrScannerMessage('관리자 신호가 확인되었습니다.')
      window.setTimeout(() => setPhase('step-story'), 300)
    }, 3000)
  }

  const handleQrAdminBypassEnd = () => {
    if (qrAdminBypassTimerRef.current !== null) {
      window.clearTimeout(qrAdminBypassTimerRef.current)
      qrAdminBypassTimerRef.current = null
    }
  }

  const currentSlide = storySlides[storyIndex]

  const renderPuzzleCard = () => {
    if ('puzzleType' in currentProblem && currentProblem.puzzleType === 'dateRiddle') {
      return (
        <div className="cipher-card date-riddle-card" aria-label="요일 추리 문제">
          <p>"어제가 내일이었으면 좋겠다."</p>
          <p>"그럼 오늘은 금요일일 텐데..."</p>
          <span>오늘 = ?</span>
        </div>
      )
    }

    if ('puzzleType' in currentProblem && currentProblem.puzzleType === 'weekday') {
      return (
        <div className="cipher-card weekday-cipher-card" aria-label="요일 숫자 문제">
          {[
            ['MON', '3'],
            ['TUE', '5'],
            ['WED', '4'],
            ['THU', '?'],
          ].map(([day, value]) => (
            <div className="weekday-cipher-row" key={day}>
              <span>{day}</span>
              <span aria-hidden="true">=</span>
              <strong className={value === '?' ? 'is-question' : ''}>{value}</strong>
            </div>
          ))}
        </div>
      )
    }

    if ('puzzleType' in currentProblem && currentProblem.puzzleType === 'handSignals') {
      const handRows = [
        [['1️⃣'], ['='], ['5️⃣']],
        [['2️⃣'], ['='], ['2️⃣']],
        [['3️⃣'], ['='], ['2️⃣']],
        [['5️⃣'], ['='], ['2️⃣']],
        [['5️⃣'], ['='], ['2️⃣']],
        [['6️⃣'], ['='], ['1️⃣']],
        [['7️⃣'], ['='], ['3️⃣']],
        [['8️⃣'], ['='], ['？']],
      ]

      return (
        <div className="cipher-card hand-cipher-card" aria-label="손가락 도형 문제">
          <p className="cipher-card-caption">SILENT SIGNAL</p>
          <div className="hand-cipher-grid">
            {handRows.map((row, rowIndex) => (
              <div className="hand-cipher-row" key={`hand-row-${rowIndex + 1}`}>
                {row.map((group, groupIndex) => (
                  <span
                    key={`${rowIndex + 1}-${groupIndex + 1}`}
                    className={group[0] === '=' ? 'is-symbol' : group[0] === '?' ? 'is-question' : 'is-hand-group'}
                  >
                    {group.map((item, itemIndex) => (
                      <span
                        key={`${item}-${itemIndex}`}
                        className={item === '?' ? 'is-question-mark' : 'is-hand'}
                      >
                        {item}
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )
    }

    if ('puzzleType' in currentProblem && currentProblem.puzzleType === 'circleCoordinate') {
      const coordinateRows = [
        { code: '39224', black: 1, white: 0 },
        { code: '77463', black: 1, white: 2 },
        { code: '77124', black: 0, white: 3 },
        { code: '29181', black: 1, white: 1 },
        { code: '?????', black: 5, white: 0, pending: true },
      ]

      return (
        <div className="cipher-card coordinate-cipher-card" aria-label="숫자와 원 위치 문제">
          {coordinateRows.map((row) => (
            <div className={`coordinate-cipher-row ${row.pending ? 'is-pending' : ''}`} key={row.code}>
              <span className="coordinate-code">{row.code}</span>
              <span className="coordinate-dots" aria-label={`검은 원 ${row.black}개, 흰 원 ${row.white}개`}>
                {Array.from({ length: row.black }).map((_, index) => (
                  <span className="dot is-black" key={`black-${row.code}-${index + 1}`} />
                ))}
                {Array.from({ length: row.white }).map((_, index) => (
                  <span className="dot is-white" key={`white-${row.code}-${index + 1}`} />
                ))}
              </span>
            </div>
          ))}
        </div>
      )
    }

    if ('puzzleType' in currentProblem && currentProblem.puzzleType === 'bibleCipher') {
      if (bibleStep === 1) {
        const references = [
          {
            label: 'A',
            verse: '마태복음 14장 17절',
            text: '떡 다섯 개와 물고기 [ A ] 마리뿐이니이다.',
          },
          {
            label: 'B',
            verse: '창세기 7장 12절',
            text: '[ B ] 주야를 비가 땅에 쏟아졌더라.',
          },
          {
            label: 'C',
            verse: '여호수아 6장 4절',
            text: '제사장 [ C ] 명은 [ C ] 양각 나팔을 잡고...',
          },
          {
            label: 'D',
            verse: '요한계시록 2장 1절',
            text: '오른손에 있는 [ D ] 별을 붙잡고...',
          },
        ]

        return (
          <div className="cipher-card bible-cipher-card" aria-label="성경 암호 1단계">
            <p className="bible-step-label">STEP 1 / 3 · 숫자 수집</p>
            <div className="bible-reference-list">
              {references.map((reference) => (
                <div className="bible-reference-item" key={reference.label}>
                  <strong>[{reference.label}] {reference.verse}</strong>
                  <p>{reference.text}</p>
                </div>
              ))}
            </div>
            <div className="bible-formula">A, B, C, D 순서대로 입력</div>
          </div>
        )
      }

      if (bibleStep === 2) {
        return (
          <div className="cipher-card bible-cipher-card" aria-label="성경 암호 2단계">
            <p className="bible-step-label">STEP 2 / 3 · 크로스 연산</p>
            <div className="bible-code-values" aria-label="수집한 숫자">
              <span>A = 2</span>
              <span>B = 40</span>
              <span>C = 7</span>
              <span>D = 7</span>
            </div>
            <div className="bible-equation">
              <span>최종 암호 코드</span>
              <strong>(B-A×C)+D+A</strong>
              <em>= ?</em>
            </div>
          </div>
        )
      }

      return (
        <div className="cipher-card bible-cipher-card" aria-label="성경 암호 3단계">
          <p className="bible-step-label">STEP 3 / 3 · 최종 구절</p>
          <p className="bible-verse-line">
            그러므로 만군의 <strong>[ ? ]</strong>의 하나님께서 이와 같이 말씀하시니라
          </p>
          <p className="bible-verse-line">
            레감의 아들 요나답에게서 내 앞에 설 사람이 영원히 끊어지지 아니하리라 하시니라.
          </p>
          <div className="bible-formula">빈칸에 들어갈 말을 띄어쓰기 없이 입력</div>
        </div>
      )
    }

    if ('puzzleType' in currentProblem && currentProblem.puzzleType === 'alphabetMix') {
      return (
        <div className="cipher-card alphabet-cipher-card" aria-label="알파벳 조합 문제">
          {['N', 'E', 'W', 'D', 'O', 'O', 'R'].map((letter, index) => (
            <span key={`letter-${letter}-${index + 1}`}>{letter}</span>
          ))}
        </div>
      )
    }

    if ('puzzleType' in currentProblem && currentProblem.puzzleType === 'koreanAnagram') {
      return (
        <div className="cipher-card korean-cipher-card" aria-label="한글 애너그램 문제">
          <p>상죄효겅</p>
          <span>자음과 모음을 회전하지 않고 이동</span>
        </div>
      )
    }

    return null
  }

  return (
    <main className="app-shell">
      <div className="screen-frame">
        <div className="screen-overlay" aria-hidden="true" />
        {gameTimerLabel ? (
          <div className={`game-timer-pill ${gameTimeRemaining === 0 ? 'is-expired' : ''}`} aria-label="남은 탐색 시간">
            <span>TIME</span>
            <strong>{gameTimerLabel}</strong>
          </div>
        ) : null}

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
              <div className="home-actions" aria-label="빠른 메뉴">
                <button
                  type="button"
                  className="home-icon-button"
                  aria-label="조 선택 화면으로 이동"
                  onClick={() => setPhase('team-select')}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M15 18L9 12L15 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="home-reset-button"
                  onClick={handleOpenResetDialog}
                >
                  새로 시작
                </button>
              </div>
              <div>
                <p className="home-app-name">사라진 빛을 찾아서</p>
                <h1 className="home-title">
                  접속이
                  <br />
                  복구되었습니다.
                </h1>
                <p className="home-subtitle">복구되지 않은 기록 7개</p>
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
                onClick={() => {
                  if (!hasCompletedJourney) {
                    handleArchiveOpen(currentProblem.archiveId)
                  }
                }}
              >
                <div className="home-now-header">
                  <span className="home-card-label">CURRENT OBJECTIVE</span>
                  <span className="home-now-badge">{hasCompletedJourney ? '도착 필요' : '조사 필요'}</span>
                </div>
                <div className="home-now-body">
                  <div>
                    <p className="home-now-location">{hasCompletedJourney ? '도착 지점' : '현재 위치'}</p>
                    <h2 className="home-now-title">{hasCompletedJourney ? finalDestination : currentArchive.name}</h2>
                    <p className="home-now-description">
                      {hasCompletedJourney
                        ? '모든 기록이 복구되었습니다. 본당으로 돌아오십시오.'
                        : `${currentProblem.title}의 기록이 발견되었습니다.`}
                    </p>
                  </div>
                </div>
                <span className="home-now-action">{hasCompletedJourney ? '본당 도착' : '조사 시작'}</span>
              </button>

              <section className="home-card home-card-progress reveal-soft">
                <p className="home-card-label">RESTORED RECORDS</p>
                <p className="home-progress-value">
                  {restoredRecordCount} <span>/ 7</span>
                </p>
                <p className="home-card-title">복구된 기록</p>
                <div className="home-progress-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(12, (restoredRecordCount / problemStages.length) * 100)}%` }} />
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
              {orderedArchives.map((archive, index) => {
                const archiveStage = index + 1
                const isRestored = archiveStage < challengeIndex
                const isCurrent = archiveStage === challengeIndex
                const isLocked = archiveStage > challengeIndex

                return (
                  <button
                    key={archive.id}
                    type="button"
                    className={[
                      'archive-card',
                      isLocked ? 'is-locked' : 'is-unlocked',
                      isRestored ? 'is-restored' : '',
                      isCurrent ? 'is-current' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={isLocked || isRestored}
                    onClick={() => handleArchiveOpen(archive.id)}
                  >
                    <div className="archive-card-header">
                      <span className="archive-card-id">ARCHIVE #{archive.id}</span>
                      <span className="archive-lock">
                        {isLocked ? 'LOCKED' : isRestored ? 'RESTORED' : 'OPEN'}
                      </span>
                    </div>
                    <p className="archive-card-title">
                      {isLocked ? '기록 복구 필요' : archive.name}
                    </p>
                    <p className="archive-card-status">
                      {isLocked
                        ? '아직 신호가 잠겨 있습니다.'
                        : isRestored
                          ? '이미 복구된 기록입니다.'
                          : `${archive.name} 조사를 시작할 수 있습니다.`}
                    </p>
                  </button>
                )
              })}
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
                <h2 className="hint-card-title">{currentProblem.title}</h2>
                <p className="hint-card-copy">
                  {currentProblem.clue}
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
                onClick={() => handleArchiveOpen(currentProblem.archiveId)}
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
              <p className="problem-kicker">
                STEP {challengeIndex} / {problemStages.length}
              </p>
              <p className="problem-state">QR 신호 대기</p>
            </div>

            <div className="problem-main-copy reveal-soft">
              <h1>QR 입력하세요.</h1>
            </div>

            <div className="qr-scan-panel reveal-soft">
              <div className={`qr-viewfinder is-${qrScannerStatus}`}>
                <video ref={qrVideoRef} muted playsInline aria-label="QR 스캔 카메라 화면" />
                <span aria-hidden="true" />
              </div>
              {qrScannerMessage ? <p className="qr-scan-message">{qrScannerMessage}</p> : null}
              <button
                type="button"
                className="problem-pill-button qr-scan-button"
                onClick={handleQrScanStart}
                onPointerDown={handleQrAdminBypassStart}
                onPointerUp={handleQrAdminBypassEnd}
                onPointerLeave={handleQrAdminBypassEnd}
                onPointerCancel={handleQrAdminBypassEnd}
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

            <p className="problem-kicker problem-floating-kicker">ARCHIVE #{currentProblem.archiveId}</p>

            <div className="problem-story-copy reveal-soft">
              {currentProblem.story.map((line) => (
                <p key={`${currentProblem.archiveId}-story-${line}`}>{line}</p>
              ))}
            </div>

            <div className="problem-bottom-row">
              <div>
                <p className="problem-tip">{currentProblem.questionLabel}</p>
                <div className="problem-progress" aria-label={`진행 ${challengeIndex}/${problemStages.length}`}>
                  {orderedArchives.map((archive) => (
                    <span
                      key={`story-progress-${archive.id}`}
                      className={archive.id === currentProblem.archiveId ? 'is-active' : ''}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="problem-pill-button"
                onClick={() => setPhase('step-puzzle')}
              >
                문제 열기
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

            <p className="problem-kicker problem-floating-kicker">ARCHIVE #{currentProblem.archiveId}</p>

            <div className="problem-puzzle-copy reveal-soft">
              <h1>{currentProblem.title}</h1>
              <p className="problem-story-brief">{currentProblem.story[0]}</p>
              <p className="problem-question-copy">{currentQuestion}</p>
              {renderPuzzleCard()}
              <label className="problem-code-field">
                <span>ANSWER</span>
                <input
                  value={recoveryCode}
                  onChange={(event) => {
                    setRecoveryCode(event.target.value)
                    if (puzzleFeedback) {
                      setPuzzleFeedback('')
                    }
                  }}
                  aria-label="정답 입력"
                  placeholder="정답을 입력하세요"
                  disabled={isPuzzleLocked}
                />
              </label>
              {puzzleFeedback ? <p className="problem-feedback">{puzzleFeedback}</p> : null}
              {isPuzzleLocked ? (
                <p className="problem-feedback">입력이 잠겼습니다. {puzzleLockRemaining}초 후 다시 시도하십시오.</p>
              ) : null}
            </div>

            <div className="problem-bottom-row">
              <div>
                {'hint' in currentProblem && currentProblem.hint ? (
                  <div className="problem-hint-action">
                    {revealedHints[currentProblem.archiveId] ? (
                      <p className="problem-tip">{currentProblem.hint}</p>
                    ) : (
                      <button
                        type="button"
                        className="problem-hint-button"
                        onClick={handleRevealHint}
                        disabled={hasReachedHintLimit}
                      >
                        <span aria-hidden="true">💡</span>
                        {hasReachedHintLimit ? '힌트 소진' : '힌트 보기'}
                      </button>
                    )}
                  </div>
                ) : null}
                <div className="problem-progress" aria-label={`진행 ${challengeIndex}/${problemStages.length}`}>
                  {orderedArchives.map((archive) => (
                    <span
                      key={`puzzle-progress-${archive.id}`}
                      className={archive.id === currentProblem.archiveId ? 'is-active' : ''}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="problem-pill-button is-bright"
                onClick={handlePuzzleSubmit}
                disabled={isPuzzleLocked}
              >
                {isPuzzleLocked ? `${puzzleLockRemaining}초` : '정답 확인'}
              </button>
            </div>
          </section>
        )}

        {phase === 'step-restored' && (
          <section className="problem-screen problem-restored-screen">
            <div className="problem-glow problem-glow-blue" aria-hidden="true" />
            <div className="problem-glow problem-glow-warm" aria-hidden="true" />

            <div className="problem-restored-header reveal-soft">
              <p className="problem-kicker is-restored">
                ARCHIVE #{currentProblem.archiveId} RESTORED
              </p>
              <span>
                {challengeIndex}/{problemStages.length}
              </span>
            </div>

            <div className="problem-restored-copy reveal-soft">
              <h1>
                기록 복구 완료.
                <br />
                신호가 안정화되었습니다.
              </h1>
              <div className="problem-hint-box">
                <p className="problem-answer-line">
                  <span>정답</span> {currentProblem.answer}
                </p>
                <p>{currentProblem.clue}</p>
                <p className="problem-next-location">
                  {challengeIndex >= problemStages.length
                    ? '모든 기록이 복구되었습니다. 빛은 사라지지 않았습니다. 당신은 마지막 탐색을 완료했습니다. 그리고 잃어버린 빛은 다시 세상으로 돌아왔습니다. 본당으로 돌아가십시오.'
                    : `다음 신호는 ${nextArchive?.name ?? finalDestination}에서 감지됩니다.`}
                </p>
              </div>
            </div>

            <div className="problem-bottom-row">
              <div className="problem-progress" aria-label={`진행 ${challengeIndex}/${problemStages.length}`}>
                {orderedArchives.map((archive) => (
                  <span
                    key={`restored-progress-${archive.id}`}
                    className={archive.id === currentProblem.archiveId ? 'is-active' : ''}
                  />
                ))}
              </div>
              <button
                type="button"
                className="problem-pill-button is-bright"
                onClick={handleNextSignal}
              >
                {challengeIndex >= problemStages.length ? '여정 완료' : '대시보드로 이동'}
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

        {isResetDialogOpen ? (
          <div className="reset-modal-backdrop" role="presentation" onClick={handleCancelReset}>
            <section
              className="reset-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-modal-title"
              aria-describedby="reset-modal-description"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="reset-modal-kicker">NEW START</p>
              <h2 id="reset-modal-title">처음부터 다시 시작하시겠습니까?</h2>
              <p id="reset-modal-description">
                지금까지의 진행 기록은 초기화됩니다. 이 동작은 되돌릴 수 없습니다.
              </p>
              <div className="reset-modal-actions">
                <button type="button" className="reset-modal-cancel" onClick={handleCancelReset}>
                  취소
                </button>
                <button type="button" className="reset-modal-confirm" onClick={handleConfirmReset}>
                  다시 시작
                </button>
              </div>
            </section>
          </div>
        ) : null}
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
    window.localStorage.setItem(
      appSessionStorageKey,
      JSON.stringify({
        phase: 'team-select',
        storyIndex: 0,
        challengeIndex: 1,
        selectedTeam: null,
        activeTeam: null,
        recoveryCode: '',
        bibleStep: 1,
        gameStartedAt: null,
        wrongAttempts: {},
        lockedUntil: {},
        revealedHints: {},
      } satisfies AppSession),
    )

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
