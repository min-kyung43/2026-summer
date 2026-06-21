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

const fakeQrMessages = [
  ['힝 속았지?', '다른 QR 찾아봥 ~ ><'],
  ['힝 속았지?', '이것도 아니지롱 ~'],
  ['힝 속았지?', '일부러 이런 것만 찾는거야?^^'],
  ['힝 속았지?', '머리를 좀 더 맞대봐 !!'],
  ['힝 속았지?', '기도 메타 ㄱㄱ'],
  ['힝 속았지?', '이제는 진짜 제대로 찾아볼까?'],
  ['힝 속았지?', '에이~ 설마 이걸 믿은 거야? 😏'],
  ['힝 속았지?', '진짜 단서는 다른 곳에 있다구 ~ 👀'],
  ['힝 속았지?', '조금만 더 찾아봐 ><'],
  ['힝 속았지?', '아직도 속으면 어떡해 .. ㅠㅠ'],
] as const

const fakeQrImages = [
  '/fake-image/fake-01.jpeg',
  '/fake-image/fake-02.jpeg',
  '/fake-image/fake-03.jpeg',
  '/fake-image/fake-04.jpg',
  '/fake-image/fake-05.jpg',
  '/fake-image/fake-06.jpg',
  '/fake-image/fake-07.png',
  '/fake-image/fake-08.gif',
  '/fake-image/fake-09.png',
] as const

const archives = [
  { id: '01', name: '본당', status: '복구 가능', locked: false },
  { id: '02', name: '수영장', status: '잠금', locked: true },
  { id: '03', name: '식당', status: '잠금', locked: true },
  { id: '04', name: '소예배실', status: '잠금', locked: true },
  { id: '05', name: '2층 복도', status: '잠금', locked: true },
  { id: '06', name: '3층', status: '잠금', locked: true },
  { id: '07', name: '야외 정자', status: '잠금', locked: true },
] as const

const teamOptions = ['1조', '2조', '3조', '4조', '5조'] as const
const teamCodes = teamOptions.map((_, index) => `TEAM${String(index + 1).padStart(2, '0')}`)
const emptyBibleStepValues = { A: '', B: '', C: '', D: '' }
const finalDestination = '본당'
const appSessionStorageKey = 'lost-light-app-session'
const adminUnlockStorageKey = 'lost-light-admin-unlocked'
const fakeQrCountStorageKey = 'lost-light-fake-qr-counts'
const gameDurationMs = 60 * 60 * 1000
const puzzleLockMs = 60 * 1000
const maxWrongAttempts = 3
const maxHintCount = 3
const handSignalAnswer = '0'
const circleCoordinateAnswer = '19767'
let sharedAudioContext: AudioContext | null = null
let ambientSound:
  | {
    oscillators: OscillatorNode[]
    filterNode: BiquadFilterNode
    gainNode: GainNode
    lfo: OscillatorNode
    lfoGain: GainNode
    loopId: number
  }
  | null = null

function getAudioContext() {
  if (typeof window === 'undefined') {
    return null
  }

  const AudioContextConstructor = window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextConstructor) {
    return null
  }

  sharedAudioContext ??= new AudioContextConstructor()

  if (sharedAudioContext.state === 'suspended') {
    void sharedAudioContext.resume()
  }

  return sharedAudioContext
}

function playTone(
  frequency: number,
  startDelay: number,
  duration: number,
  options: {
    type?: OscillatorType
    gain?: number
    detune?: number
    filterFrequency?: number
    destination?: AudioNode
  } = {},
) {
  const audioContext = getAudioContext()

  if (!audioContext) {
    return
  }

  const startTime = audioContext.currentTime + startDelay
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  const filterNode = audioContext.createBiquadFilter()

  oscillator.type = options.type ?? 'sine'
  oscillator.frequency.setValueAtTime(frequency, startTime)
  oscillator.detune.setValueAtTime(options.detune ?? 0, startTime)
  filterNode.type = 'lowpass'
  filterNode.frequency.setValueAtTime(options.filterFrequency ?? 1600, startTime)
  gainNode.gain.setValueAtTime(0.0001, startTime)
  gainNode.gain.exponentialRampToValueAtTime(options.gain ?? 0.04, startTime + 0.018)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  oscillator.connect(filterNode)
  filterNode.connect(gainNode)
  gainNode.connect(options.destination ?? audioContext.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration + 0.04)
}

function playNoiseBurst(duration = 0.12, gain = 0.03, filterFrequency = 900) {
  const audioContext = getAudioContext()

  if (!audioContext) {
    return
  }

  const bufferSize = Math.max(1, Math.floor(audioContext.sampleRate * duration))
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
  const output = buffer.getChannelData(0)

  for (let index = 0; index < bufferSize; index += 1) {
    output[index] = (Math.random() * 2 - 1) * (1 - index / bufferSize)
  }

  const source = audioContext.createBufferSource()
  const filterNode = audioContext.createBiquadFilter()
  const gainNode = audioContext.createGain()
  const startTime = audioContext.currentTime

  source.buffer = buffer
  filterNode.type = 'bandpass'
  filterNode.frequency.setValueAtTime(filterFrequency, startTime)
  filterNode.Q.setValueAtTime(4, startTime)
  gainNode.gain.setValueAtTime(gain, startTime)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  source.connect(filterNode)
  filterNode.connect(gainNode)
  gainNode.connect(audioContext.destination)
  source.start(startTime)
  source.stop(startTime + duration)
}

function playMusicNote(
  frequency: number,
  startDelay: number,
  duration: number,
  gain = 0.028,
) {
  const audioContext = getAudioContext()

  if (!audioContext) {
    return
  }

  const startTime = audioContext.currentTime + startDelay
  const oscillator = audioContext.createOscillator()
  const overtone = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  const filterNode = audioContext.createBiquadFilter()
  const delayNode = audioContext.createDelay(0.7)
  const delayGain = audioContext.createGain()

  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(frequency, startTime)
  overtone.type = 'sine'
  overtone.frequency.setValueAtTime(frequency * 2.01, startTime)
  filterNode.type = 'lowpass'
  filterNode.frequency.setValueAtTime(1600, startTime)
  delayNode.delayTime.setValueAtTime(0.24, startTime)
  delayGain.gain.setValueAtTime(gain * 0.32, startTime)
  gainNode.gain.setValueAtTime(0.0001, startTime)
  gainNode.gain.exponentialRampToValueAtTime(gain, startTime + 0.035)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  oscillator.connect(filterNode)
  overtone.connect(filterNode)
  filterNode.connect(gainNode)
  gainNode.connect(audioContext.destination)
  gainNode.connect(delayNode)
  delayNode.connect(delayGain)
  delayGain.connect(audioContext.destination)
  oscillator.start(startTime)
  overtone.start(startTime)
  oscillator.stop(startTime + duration + 0.08)
  overtone.stop(startTime + duration + 0.08)
}

function playAmbientPhrase() {
  const melody = [261.63, 311.13, 392, 369.99, 311.13, 233.08]

  melody.forEach((frequency, index) => {
    playMusicNote(frequency, index * 0.46, index === 2 ? 0.72 : 0.42, index === 2 ? 0.032 : 0.024)
  })
  playMusicNote(130.81, 0, 2.1, 0.014)
  playMusicNote(196, 1.45, 1.2, 0.012)
}

function startAmbientSound() {
  const audioContext = getAudioContext()

  if (!audioContext || ambientSound) {
    return
  }

  const filterNode = audioContext.createBiquadFilter()
  const gainNode = audioContext.createGain()
  const lfo = audioContext.createOscillator()
  const lfoGain = audioContext.createGain()
  const startTime = audioContext.currentTime
  const droneDefinitions: Array<{ frequency: number; type: OscillatorType; detune: number }> = [
    { frequency: 65.41, type: 'sine', detune: -8 },
    { frequency: 98, type: 'sine', detune: 6 },
  ]

  filterNode.type = 'lowpass'
  filterNode.frequency.setValueAtTime(680, startTime)
  filterNode.Q.setValueAtTime(0.7, startTime)
  gainNode.gain.setValueAtTime(0.0001, startTime)
  gainNode.gain.linearRampToValueAtTime(0.009, startTime + 1.8)

  lfo.type = 'sine'
  lfo.frequency.setValueAtTime(0.045, startTime)
  lfoGain.gain.setValueAtTime(0.003, startTime)
  lfo.connect(lfoGain)
  lfoGain.connect(gainNode.gain)

  const oscillators = droneDefinitions.map((definition) => {
    const oscillator = audioContext.createOscillator()

    oscillator.type = definition.type
    oscillator.frequency.setValueAtTime(definition.frequency, startTime)
    oscillator.detune.setValueAtTime(definition.detune, startTime)
    oscillator.connect(filterNode)
    oscillator.start(startTime)

    return oscillator
  })

  filterNode.connect(gainNode)
  gainNode.connect(audioContext.destination)
  lfo.start(startTime)
  playAmbientPhrase()
  const loopId = window.setInterval(playAmbientPhrase, 3600)
  ambientSound = { oscillators, filterNode, gainNode, lfo, lfoGain, loopId }
}

function playButtonSound() {
  playTone(520, 0, 0.08, { type: 'triangle', gain: 0.018, filterFrequency: 1400 })
  playTone(92, 0.008, 0.1, { type: 'sine', gain: 0.012, filterFrequency: 260 })
}

function playOnboardingSound() {
  playNoiseBurst(0.1, 0.01, 1600)
  playTone(196, 0, 0.55, { type: 'sine', gain: 0.028, filterFrequency: 700 })
  playTone(293.66, 0.08, 0.52, { type: 'sine', gain: 0.022, detune: -8, filterFrequency: 1000 })
  playTone(392, 0.2, 0.5, { type: 'triangle', gain: 0.018, filterFrequency: 1400 })
  playTone(987.77, 0.44, 0.16, { type: 'sine', gain: 0.014, filterFrequency: 2600 })
}

function playBootSound() {
  playNoiseBurst(0.18, 0.026, 920)
  playTone(92, 0, 0.24, { type: 'sawtooth', gain: 0.018, filterFrequency: 420 })
  playTone(220, 0.12, 0.16, { type: 'square', gain: 0.014, filterFrequency: 1200 })
  playTone(440, 0.24, 0.14, { type: 'square', gain: 0.012, filterFrequency: 1800 })
  playTone(880, 0.36, 0.22, { type: 'triangle', gain: 0.018, filterFrequency: 2600 })
  playNoiseBurst(0.08, 0.014, 2200)
}

function playQrFoundSound() {
  playTone(659.25, 0, 0.1, { type: 'triangle', gain: 0.026, filterFrequency: 1800 })
  playTone(987.77, 0.08, 0.18, { type: 'sine', gain: 0.022, filterFrequency: 2200 })
}

function playPuzzleSuccessSound() {
  playTone(261.63, 0, 0.24, { type: 'sine', gain: 0.022, filterFrequency: 1000 })
  playTone(392, 0.08, 0.28, { type: 'sine', gain: 0.024, filterFrequency: 1300 })
  playTone(587.33, 0.18, 0.42, { type: 'triangle', gain: 0.026, filterFrequency: 1800 })
}

function playPuzzleFailureSound() {
  playNoiseBurst(0.18, 0.026, 360)
  playTone(220, 0, 0.22, { type: 'sawtooth', gain: 0.024, filterFrequency: 520 })
  playTone(146.83, 0.08, 0.3, { type: 'sine', gain: 0.02, filterFrequency: 360 })
}

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
    hint: '숫자 야구 게임을 떠올려보세요.',
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
      '흩어진 알파벳을 모두 사용해 한 단어를 완성해야 한다.',
    ],
    story: [
      '손상된 기록 속에는 흩어진 문자만 남아 있다.',
      '문자들은 하나의 의미를 가지고 있었지만',
      '시간이 흐르며 순서가 사라졌다.',
    ],
    questionLabel: '문제',
    question: '주어진 알파벳들을 모두 사용하여 한 단어를 완성하시오.',
    answer: 'ONE WORD',
    answers: ['ONE WORD', 'ONEWORD'],
    clueTitle: '문제를 풀었을 때 얻는 단서',
    clue: '가장 높은 곳에서 희미한 빛이 감지된다. 아직 완전히 꺼지지 않은 흔적.',
    actionText: 'QR 스캔 시작',
    tip: '현장 QR 신호를 스캔하십시오.',
    hint: "'한 단어'",
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
  bibleStepValues: typeof emptyBibleStepValues
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

function isBibleStepValues(value: unknown): value is typeof emptyBibleStepValues {
  if (!value || typeof value !== 'object') {
    return false
  }

  const values = value as Record<string, unknown>

  return ['A', 'B', 'C', 'D'].every((key) => typeof values[key] === 'string')
}

function loadStoredSession(): Partial<AppSession> {
  try {
    const previewArchiveId = new URLSearchParams(window.location.search).get('previewArchive')
    const previewTeam = new URLSearchParams(window.location.search).get('team')
    const previewTeamOption = isTeamOption(previewTeam) ? previewTeam : '1조'
    const previewStage = previewArchiveId ? getTeamStageByArchiveId(previewArchiveId, previewTeamOption) : null

    if (previewStage !== null) {
      return {
        phase: 'step-puzzle',
        storyIndex: 0,
        challengeIndex: previewStage,
        selectedTeam: previewTeamOption,
        activeTeam: {
          ...createFallbackTeamRecord(previewTeamOption),
          current_stage: previewStage,
          completed_count: Math.max(0, previewStage - 1),
        },
        recoveryCode: '',
        bibleStep: 1,
        bibleStepValues: emptyBibleStepValues,
        gameStartedAt: Date.now(),
        wrongAttempts: {},
        lockedUntil: {},
        revealedHints: {},
      }
    }

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
      bibleStepValues: isBibleStepValues(parsedSession.bibleStepValues) ? parsedSession.bibleStepValues : emptyBibleStepValues,
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
    return window.location.pathname === '/admin'
      || window.sessionStorage.getItem(adminUnlockStorageKey) === 'true'
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
  return teamOptions.map((teamName) => ({
    ...createFallbackTeamRecord(teamName),
    started_at: null,
  }))
}

function createResetTeamPayload(teamName: TeamOption) {
  return {
    team_name: teamName,
    team_code: getTeamCodeForOption(teamName),
    current_stage: 1,
    completed_count: 0,
    hint_count: 0,
    is_finished: false,
    started_at: null,
    finished_at: null,
  }
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

function getFakeQrIdFromValue(value: string) {
  const match = value.trim().match(/^FAKE-QR-(\d{2})$/)

  return match ? match[1] : null
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

function getBibleStepHint(step: number) {
  if (step === 1) {
    return '각 구절의 빈칸에 들어가는 숫자만 A, B, C, D에 넣어보세요.'
  }

  if (step === 2) {
    return '곱셈을 먼저 계산한 뒤, 왼쪽부터 차례대로 식을 풀어보세요.'
  }

  return '주변에 성경책을 찾아보시오.'
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

function getStoredFakeQrTeamKey() {
  try {
    const storedSession = window.localStorage.getItem(appSessionStorageKey)

    if (!storedSession) {
      return 'unknown'
    }

    const parsedSession = JSON.parse(storedSession) as Partial<AppSession>
    const teamName = isTeamOption(parsedSession.selectedTeam)
      ? parsedSession.selectedTeam
      : parsedSession.activeTeam
        ? getTeamOptionFromRecord(parsedSession.activeTeam)
        : null

    return teamName ? getTeamCodeForOption(teamName) : 'unknown'
  } catch {
    return 'unknown'
  }
}

function getNextFakeQrVisit(teamKey: string) {
  try {
    const storedCounts = window.localStorage.getItem(fakeQrCountStorageKey)
    const counts = storedCounts ? JSON.parse(storedCounts) as Record<string, number> : {}
    const nextCount = (counts[teamKey] ?? 0) + 1

    window.localStorage.setItem(
      fakeQrCountStorageKey,
      JSON.stringify({
        ...counts,
        [teamKey]: nextCount,
      }),
    )

    return nextCount
  } catch {
    return 1
  }
}

type AdminDashboardProps = {
  onBack: () => void
}

function FakeQrPage() {
  const [fakeVisit] = useState(() => {
    const teamKey = getStoredFakeQrTeamKey()

    return getNextFakeQrVisit(teamKey)
  })

  const messageIndex = Math.max(0, Math.min(fakeVisit, fakeQrMessages.length) - 1)
  const [headline, body] = fakeQrMessages[messageIndex]
  const imagePath = fakeQrImages[Math.max(0, fakeVisit - 1) % fakeQrImages.length]

  const handleReturn = () => {
    window.location.href = '/'
  }

  return (
    <main className="app-shell">
      <div className="screen-frame fake-qr-screen">
        <div className="screen-overlay" aria-hidden="true" />
        <button type="button" className="fake-qr-home-button" onClick={handleReturn}>
          HOME
        </button>
        <section className="fake-qr-content" aria-label="가짜 QR 안내">
          <div className="fake-qr-image-frame">
            <img src={imagePath} alt="" className="fake-qr-image" />
          </div>
          <div className="fake-qr-copy" lang="ko">
            <p>{headline}</p>
            <p>{body}</p>
          </div>
          <div className="fake-qr-divider" aria-hidden="true" />
          <div className="fake-qr-action-row">
            <button type="button" className="fake-qr-retry-button" onClick={handleReturn}>
              QR 다시 찍기
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

function AdminDashboard({ onBack }: AdminDashboardProps) {
  const adminUnlocked = isAdminUnlocked()
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [isLoadingTeams, setIsLoadingTeams] = useState(true)
  const [adminError, setAdminError] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [isResettingTeams, setIsResettingTeams] = useState(false)
  const [resettingTeamCode, setResettingTeamCode] = useState<string | null>(null)

  const loadTeams = async (showLoading = false) => {
    if (showLoading) {
      setIsLoadingTeams(true)
    }

    const { data, error } = await supabase
      .from('teams')
      .select('id, team_name, team_code, current_stage, completed_count, hint_count, is_finished, started_at, finished_at')
      .in('team_code', teamCodes)
      .order('team_code', { ascending: true })

    if (error || !data || data.length === 0) {
      setAdminError('연결된 팀 데이터가 없어 기본 조별 보드를 표시합니다.')
      setTeams(createFallbackAdminTeams())
    } else {
      const dataByCode = new Map(data.map((row) => [row.team_code, row]))
      setAdminError('')
      setTeams(
        teamOptions.map((teamName) => {
          const teamCode = getTeamCodeForOption(teamName)

          return dataByCode.get(teamCode) ?? {
            id: teamCode,
            ...createResetTeamPayload(teamName),
          }
        }),
      )
    }

    setLastSyncedAt(new Date())
    setIsLoadingTeams(false)
  }

  useEffect(() => {
    if (!adminUnlocked) {
      setIsLoadingTeams(false)
      return
    }

    let isMounted = true

    void loadTeams(true)
    const syncTimer = window.setInterval(() => {
      if (isMounted) {
        void loadTeams(false)
      }
    }, 5000)

    return () => {
      isMounted = false
      window.clearInterval(syncTimer)
    }
  }, [adminUnlocked])

  const handleResetAllTeams = async () => {
    if (!window.confirm('모든 조의 진행상황을 초기화합니다. 모든 기기는 조 선택 화면으로 돌아갑니다.')) {
      return
    }

    setIsResettingTeams(true)
    const resetRows = teamOptions.map((teamName) => createResetTeamPayload(teamName))
    const { error } = await supabase
      .from('teams')
      .upsert(resetRows, { onConflict: 'team_code' })

    if (error) {
      setAdminError('전체 초기화에 실패했습니다. Supabase 권한을 확인해주세요.')
    } else {
      setAdminError('')
      setTeams(createFallbackAdminTeams())
      setLastSyncedAt(new Date())
    }

    setIsResettingTeams(false)
  }

  const handleManualRefresh = () => {
    void loadTeams(true)
  }

  const handleResetTeam = async (teamName: TeamOption) => {
    const teamCode = getTeamCodeForOption(teamName)

    if (!window.confirm(`${teamName} 진행상황을 초기화합니다. 해당 조 기기는 조 선택 화면으로 돌아갑니다.`)) {
      return
    }

    setResettingTeamCode(teamCode)

    const { error } = await supabase
      .from('teams')
      .upsert(createResetTeamPayload(teamName), { onConflict: 'team_code' })

    if (error) {
      setAdminError(`${teamName} 초기화에 실패했습니다. Supabase 권한을 확인해주세요.`)
    } else {
      setAdminError('')
      await loadTeams(false)
    }

    setResettingTeamCode(null)
  }

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

  const enteredTeams = teams.filter((row) => Boolean(row.started_at)).length
  const activeTeams = teams.filter((row) => Boolean(row.started_at) && !row.is_finished).length
  const hintUsedTeams = teams.reduce((total, row) => total + row.hint_count, 0)
  const completedTeams = teams.filter((row) => row.is_finished).length
  const syncLabel = lastSyncedAt
    ? `LAST SYNC ${lastSyncedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
    : 'LAST SYNC --:--'

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
          <p className="admin-timestamp">{syncLabel} · AUTO 5S</p>
        </header>
        <div className="admin-action-row">
          <button
            type="button"
            className="admin-refresh-button"
            onClick={handleManualRefresh}
            disabled={isLoadingTeams}
          >
            {isLoadingTeams ? '동기화 중' : '수동 새로고침'}
          </button>
          <button
            type="button"
            className="admin-reset-all-button"
            onClick={handleResetAllTeams}
            disabled={isResettingTeams}
          >
            {isResettingTeams ? '초기화 중' : '전체 기기 초기화'}
          </button>
        </div>

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
            <span>입장 완료</span>
            <strong>{enteredTeams}</strong>
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
                {(() => {
                  const hasEntered = Boolean(row.started_at)
                  const teamOption = getTeamOptionFromRecord(row)
                  const currentTeamArchive = getTeamArchiveByStage(row.current_stage, teamOption)
                  const nextTeamArchive = getNextTeamArchiveByStage(row.current_stage, teamOption)

                  return (
                    <>
                <div className="admin-team-card-header">
                  <div>
                    <p className="admin-team-name">{row.team_name} - 진행 상황</p>
                    <p className="admin-stage">
                      {row.team_code} · {hasEntered ? `현재 기록 ARCHIVE #${currentTeamArchive.id}` : '입장 대기'}
                    </p>
                  </div>
                  <span className={`admin-status ${row.is_finished ? 'is-complete' : hasEntered ? 'is-active' : 'is-idle'}`}>
                    {row.is_finished ? '완료' : hasEntered ? '진행 중' : '대기'}
                  </span>
                </div>
                <div className="admin-team-body">
                  <div className="admin-team-location">
                    <span>현재 위치</span>
                    <strong>{!hasEntered ? '입장 전' : row.is_finished ? finalDestination : currentTeamArchive.name}</strong>
                    <p className="admin-team-note">
                      {row.is_finished
                        ? '본당 도착'
                        : hasEntered
                          ? `다음 기록 · ${nextTeamArchive.name}`
                          : '조 선택 후 진행이 시작됩니다.'}
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
                <div className="admin-team-actions">
                  <button
                    type="button"
                    className="admin-reset-team-button"
                    onClick={() => void handleResetTeam(teamOption)}
                    disabled={resettingTeamCode === row.team_code}
                  >
                    {resettingTeamCode === row.team_code ? '초기화 중' : `${row.team_name} 초기화`}
                  </button>
                </div>
                    </>
                  )
                })()}
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
  const [phase, setPhase] = useState<Phase>(storedSession.phase ?? 'team-select')
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
  const [bibleStepValues, setBibleStepValues] = useState(storedSession.bibleStepValues ?? emptyBibleStepValues)
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
  const missionFailedTapCountRef = useRef(0)

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
        bibleStepValues,
        gameStartedAt,
        wrongAttempts,
        lockedUntil,
        revealedHints,
      } satisfies AppSession),
    )
  }, [activeTeam, bibleStep, bibleStepValues, challengeIndex, gameStartedAt, lockedUntil, phase, recoveryCode, revealedHints, selectedTeam, storyIndex, wrongAttempts])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const handleFirstInteraction = () => {
      startAmbientSound()
    }

    const handleButtonClick = (event: MouseEvent) => {
      const target = event.target

      if (target instanceof Element && target.closest('button')) {
        startAmbientSound()
        playButtonSound()
      }
    }

    document.addEventListener('pointerdown', handleFirstInteraction)
    document.addEventListener('click', handleButtonClick)

    return () => {
      document.removeEventListener('pointerdown', handleFirstInteraction)
      document.removeEventListener('click', handleButtonClick)
    }
  }, [])

  useEffect(() => {
    if (phase === 'story') {
      playOnboardingSound()
      return
    }

    if (phase === 'boot') {
      playBootSound()
    }
  }, [phase, storyIndex])

  useEffect(() => {
    if (!activeTeam?.team_code) {
      return
    }

    let isMounted = true
    const activeTeamCode = activeTeam.team_code

    async function refreshTeam() {
      const { data, error } = await supabase
        .from('teams')
        .select('id, team_name, team_code, current_stage, completed_count, hint_count, is_finished, started_at, finished_at')
        .eq('team_code', activeTeamCode)
        .maybeSingle()

      if (!isMounted || error || !data) {
        return
      }

      if (data.started_at === null && phase !== 'team-select') {
        window.localStorage.removeItem(appSessionStorageKey)
        window.localStorage.removeItem(fakeQrCountStorageKey)
        setPhase('team-select')
        setStoryIndex(0)
        setChallengeIndex(1)
        setSelectedTeam(null)
        setActiveTeam(null)
        setRecoveryCode('')
        setBibleStep(1)
        setBibleStepValues(emptyBibleStepValues)
        setPuzzleFeedback('')
        setGameStartedAt(null)
        setWrongAttempts({})
        setLockedUntil({})
        setRevealedHints({})
        setVisibleBootLines(0)
        setQrScannerStatus('idle')
        setQrScannerMessage('')
        return
      }

      setActiveTeam(data)
    }

    void refreshTeam()
    const refreshTimer = window.setInterval(() => {
      void refreshTeam()
    }, 5000)

    return () => {
      isMounted = false
      window.clearInterval(refreshTimer)
    }
  }, [activeTeam?.team_code, phase])

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
  const isBibleFirstStep = isCurrentBibleCipher && bibleStep === 1
  const currentQuestion = isCurrentBibleCipher ? getBibleStepQuestion(bibleStep) : currentProblem.question
  const currentHint = isCurrentBibleCipher
    ? getBibleStepHint(bibleStep)
    : 'hint' in currentProblem
      ? currentProblem.hint
      : ''
  const currentHintKey = isCurrentBibleCipher ? `${currentProblem.archiveId}-${bibleStep}` : currentProblem.archiveId
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
  const hasMissionFailed = gameTimeRemaining === 0 && !hasCompletedJourney

  const handleAdvanceStory = () => {
    if (storyIndex === storySlides.length - 1) {
      setVisibleBootLines(0)
      setPhase('boot')
      return
    }

    setStoryIndex((current) => current + 1)
  }

  const handleStart = () => {
    if (selectedTeam) {
      setPhase('archive-home')
      return
    }

    setPhase('team-select')
  }

  const handleOpenResetDialog = () => {
    setIsResetDialogOpen(true)
  }

  const handleCancelReset = () => {
    setIsResetDialogOpen(false)
  }

  const resetLocalProgress = () => {
    window.localStorage.removeItem(appSessionStorageKey)
    window.localStorage.removeItem(fakeQrCountStorageKey)
    setPhase('team-select')
    setStoryIndex(0)
    setChallengeIndex(1)
    setSelectedTeam(null)
    setActiveTeam(null)
    setRecoveryCode('')
    setBibleStep(1)
    setBibleStepValues(emptyBibleStepValues)
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

  const handleConfirmReset = () => {
    resetLocalProgress()
  }

  const handleMissionFailedTap = () => {
    startAmbientSound()
    missionFailedTapCountRef.current += 1

    if (missionFailedTapCountRef.current >= 5) {
      missionFailedTapCountRef.current = 0
      playPuzzleSuccessSound()
      resetLocalProgress()
    }
  }

  const handleTeamSelect = async (teamName: TeamOption) => {
    const teamCode = getTeamCodeForOption(teamName)
    const startedAt = new Date().toISOString()

    setIsTeamSelectLoading(true)
    setSelectedTeam(teamName)
    setActiveTeam(createFallbackTeamRecord(teamName))
    setStoryIndex(0)
    setVisibleBootLines(0)
    setPhase('story')

    try {
      const { data } = await supabase
        .from('teams')
        .select('id, team_name, team_code, current_stage, completed_count, hint_count, is_finished, started_at, finished_at')
        .eq('team_code', teamCode)
        .maybeSingle()

      if (data) {
        if (data.started_at === null) {
          const nextTeam = {
            ...data,
            started_at: startedAt,
          }

          setActiveTeam(nextTeam)
          await supabase
            .from('teams')
            .update({ started_at: startedAt })
            .eq('team_code', teamCode)
        } else {
          setActiveTeam(data)
        }
      } else {
        const fallbackTeam = {
          ...createFallbackTeamRecord(teamName),
          started_at: startedAt,
        }

        setActiveTeam(fallbackTeam)
        await supabase
          .from('teams')
          .insert({
            team_name: teamName,
            team_code: teamCode,
            current_stage: fallbackTeam.current_stage,
            completed_count: fallbackTeam.completed_count,
            hint_count: fallbackTeam.hint_count,
            is_finished: fallbackTeam.is_finished,
            started_at: fallbackTeam.started_at,
            finished_at: fallbackTeam.finished_at,
          })
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
    setBibleStepValues(emptyBibleStepValues)
    setPuzzleFeedback('')
    setQrScannerStatus('idle')
    setQrScannerMessage('')
    setPhase('step-intro')
  }

  const handlePuzzleSubmit = async () => {
    if (isPuzzleLocked) {
      playPuzzleFailureSound()
      setPuzzleFeedback(`기록 접근이 잠시 제한되었습니다. ${puzzleLockRemaining}초 후 다시 시도하십시오.`)
      return
    }

    const isBibleCipher = 'puzzleType' in currentProblem && currentProblem.puzzleType === 'bibleCipher'
    const expectedAnswers = isBibleCipher ? getBibleStepAnswers(bibleStep) : getProblemAnswers(currentProblem)
    const submittedAnswer = isBibleCipher && bibleStep === 1
      ? `${bibleStepValues.A}${bibleStepValues.B}${bibleStepValues.C}${bibleStepValues.D}`
      : recoveryCode
    const isCorrect = expectedAnswers.some(
      (answer) => normalizeAnswer(submittedAnswer) === normalizeAnswer(answer),
    )

    if (!isCorrect) {
      playPuzzleFailureSound()
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

    playPuzzleSuccessSound()
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
    setBibleStepValues(emptyBibleStepValues)
    setPuzzleFeedback('')
    setQrScannerStatus('idle')
    setQrScannerMessage('')
    setPhase('archive-home')
  }

  const handleRevealHint = async () => {
    if (!currentHint) {
      return
    }

    if (revealedHints[currentHintKey]) {
      return
    }

    if (hasReachedHintLimit) {
      setPuzzleFeedback(`힌트는 최대 ${maxHintCount}번까지만 사용할 수 있습니다.`)
      return
    }

    setRevealedHints((current) => ({
      ...current,
      [currentHintKey]: true,
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

          const scannedValue = result.getText()
          const fakeQrId = getFakeQrIdFromValue(scannedValue)

          if (fakeQrId) {
            qrScannerControlsRef.current.stop()
            qrScannerControlsRef.current = null
            playPuzzleFailureSound()
            window.location.href = `/?fakeQr=${fakeQrId}`
            return
          }

          if (scannedValue !== getArchiveQrValue(currentProblem.archiveId)) {
            playPuzzleFailureSound()
            setQrScannerStatus('error')
            setQrScannerMessage(`${currentArchive.name} QR만 인식할 수 있습니다.`)
            return
          }

          qrScannerControlsRef.current.stop()
          qrScannerControlsRef.current = null
          setQrScannerStatus('found')
          setQrScannerMessage('QR 신호가 확인되었습니다.')
          playQrFoundSound()
          window.setTimeout(() => setPhase('step-story'), 500)
        }
      )

      qrScannerControlsRef.current = controls
    } catch {
      qrScannerControlsRef.current?.stop()
      qrScannerControlsRef.current = null
      setQrScannerStatus('error')
      setQrScannerMessage('카메라 권한을 허용한 뒤 다시 시도해주세요.')
      playPuzzleFailureSound()
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
      playQrFoundSound()
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
            <div className="bible-formula">아래 입력칸에 A, B, C, D 값을 각각 입력</div>
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

        {hasMissionFailed ? (
          <button
            type="button"
            className="mission-failed-overlay"
            role="alert"
            aria-live="assertive"
            aria-label="임무 실패 화면"
            onClick={handleMissionFailedTap}
          >
            <div className="mission-failed-panel">
              <p className="mission-failed-kicker">MISSION FAILED</p>
              <h2>임무 실패</h2>
              <p>
                영원한 어둠 속에 갇혀버렸다 ...
                <br />
                본당으로 복귀하세요
              </p>
            </div>
          </button>
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
                <div className="home-progress-summary">
                  <p className="home-card-title">복구 단계</p>
                  <p className="home-progress-value">
                    {restoredRecordCount} <span>/ 7</span>
                  </p>
                </div>
                <div className="home-stage-path" aria-label={`복구 단계 ${restoredRecordCount}/7`}>
                  {orderedArchives.map((archive, index) => {
                    const stageNumber = index + 1
                    const isRestored = stageNumber <= restoredRecordCount
                    const isCurrent = !hasCompletedJourney && stageNumber === challengeIndex
                    const stateLabel = isRestored ? '복구 완료' : isCurrent ? '현재 단계' : '잠김'

                    return (
                      <div
                        className={`home-stage-node ${isRestored ? 'is-restored' : ''} ${isCurrent ? 'is-current' : ''}`}
                        key={`home-stage-${archive.id}`}
                      >
                        <span className="home-stage-dot" aria-label={`ARCHIVE #${archive.id} ${stateLabel}`}>
                          {isRestored ? '✓' : stageNumber}
                        </span>
                        <span className="home-stage-label">
                          {isRestored || isCurrent ? archive.name : '기록 복구 필요'}
                        </span>
                      </div>
                    )
                  })}
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
                const isRestored = archiveStage <= restoredRecordCount
                const isCurrent = !isRestored && archiveStage === challengeIndex
                const isLocked = !isRestored && archiveStage > challengeIndex

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
                <span className="hint-card-title">
                  {hasCompletedJourney ? `${finalDestination}으로 이동` : `${currentArchive.name}으로 이동`}
                </span>
                <span className="hint-card-copy">
                  {hasCompletedJourney
                    ? '모든 기록이 복구되었습니다. 마지막 장소로 돌아가십시오.'
                    : `${currentProblem.title} 기록을 복구하려면 현장 QR 신호를 스캔하십시오.`}
                </span>
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
              {isBibleFirstStep ? (
                <div className="bible-answer-grid" aria-label="성경 숫자 입력">
                  {(['A', 'B', 'C', 'D'] as const).map((key) => (
                    <label className="bible-answer-field" key={`bible-answer-${key}`}>
                      <span>{key}</span>
                      <input
                        inputMode="numeric"
                        value={bibleStepValues[key]}
                        onChange={(event) => {
                          setBibleStepValues((current) => ({
                            ...current,
                            [key]: event.target.value.replace(/\D/g, ''),
                          }))
                          if (puzzleFeedback) {
                            setPuzzleFeedback('')
                          }
                        }}
                        aria-label={`${key} 값 입력`}
                        placeholder={key}
                        disabled={isPuzzleLocked}
                      />
                    </label>
                  ))}
                </div>
              ) : (
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
              )}
              {puzzleFeedback ? <p className="problem-feedback">{puzzleFeedback}</p> : null}
              {isPuzzleLocked ? (
                <p className="problem-feedback">입력이 잠겼습니다. {puzzleLockRemaining}초 후 다시 시도하십시오.</p>
              ) : null}
            </div>

            <div className="problem-bottom-row">
              <div>
                {currentHint ? (
                  <div className="problem-hint-action">
                    {revealedHints[currentHintKey] ? (
                      <p className="problem-tip">{currentHint}</p>
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
              {challengeIndex >= problemStages.length ? (
                <button
                  type="button"
                  className="problem-final-instruction"
                  onClick={handleNextSignal}
                >
                  본당으로 이동하세요.
                </button>
              ) : (
                <button
                  type="button"
                  className="problem-pill-button is-bright"
                  onClick={handleNextSignal}
                >
                  대시보드로 이동
                </button>
              )}
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
  const [locationKey, setLocationKey] = useState(() => `${window.location.pathname}${window.location.search}`)

  useEffect(() => {
    const handlePopState = () => {
      setLocationKey(`${window.location.pathname}${window.location.search}`)
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

    setLocationKey('/admin')
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
        bibleStepValues: emptyBibleStepValues,
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
          setLocationKey('/')
        }
      }, 120)
      return
    }

    window.history.pushState(null, '', '/')
    setLocationKey('/')
  }

  const pathname = locationKey.split('?')[0]
  const searchParams = new URLSearchParams(window.location.search)
  const isFakeQrRoute = searchParams.has('fakeQr')
  const isAdminRoute = pathname === '/admin'

  if (isFakeQrRoute) {
    return <FakeQrPage />
  }

  return isAdminRoute ? (
    <AdminDashboard onBack={handleAdminBack} />
  ) : (
    <OnboardingApp onAdminOpen={handleAdminOpen} />
  )
}

export default App
