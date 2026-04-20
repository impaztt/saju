import { FLOW_MAP } from "../data/questionFlows";
import {
  RESULT_CARD_TITLES,
  SIGNAL_TEMPLATES,
  TOPIC_BASE_TEMPLATES,
  type TopicBaseTemplate
} from "../data/resultTemplates";
import type {
  BranchCondition,
  ConsultationMode,
  ConsultationResult,
  ConsultationSession,
  QuestionNode,
  ResultCard,
  ResultGenerationSource,
  SessionCompatibility,
  TopicFlow,
  TopicId,
  UserProfile
} from "../types";

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function safeRandomUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const random = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);
  return `${timestamp}-${random}`;
}

function makeId(prefix: string) {
  return prefix + "-" + safeRandomUuid();
}

function section(title: string, body: string) {
  return "[" + title + "]\n" + body;
}

export function getTopicFlow(topicId: TopicId): TopicFlow {
  return FLOW_MAP[topicId];
}

export function getNode(flow: TopicFlow, nodeId: string | null) {
  if (!nodeId) {
    return undefined;
  }

  return flow.nodes.find((candidate) => candidate.id === nodeId);
}

function getRemainingDepth(session: ConsultationSession, flow: TopicFlow, nodeId: string | null): number {
  const memo = new Map<string, number>();

  const walk = (targetNodeId: string | null, visiting: Set<string>): number => {
    if (!targetNodeId) {
      return 0;
    }

    if (memo.has(targetNodeId)) {
      return memo.get(targetNodeId) ?? 0;
    }

    if (visiting.has(targetNodeId)) {
      return 0;
    }

    const node = getNode(flow, targetNodeId);
    if (!node) {
      return 0;
    }

    const nextVisiting = new Set(visiting);
    nextVisiting.add(targetNodeId);

    const nextIds = new Set<string | null>();
    node.options.forEach((option) => {
      nextIds.add(option.next);
    });
    const matchedRule = node.branchRules?.find((rule) =>
      rule.when.every((condition) => conditionMatches(session, condition))
    );
    if (matchedRule) {
      nextIds.add(matchedRule.next);
    }

    const depths = Array.from(nextIds).map((nextId) => walk(nextId, nextVisiting));
    const depth = 1 + Math.max(0, ...depths);
    memo.set(targetNodeId, depth);
    return depth;
  };

  return walk(nodeId, new Set<string>());
}

export function getProgressPercent(session: ConsultationSession) {
  const flow = getTopicFlow(session.topicId);
  const total = session.currentNodeId
    ? Math.max(session.responses.length + getRemainingDepth(session, flow, session.currentNodeId), 1)
    : Math.max(session.responses.length, 1);
  const current = session.currentNodeId ? session.responses.length + 1 : session.responses.length;

  return Math.round((current / total) * 100);
}

function getConditionValue(session: ConsultationSession, field: string) {
  if (field === "session.consultMode") {
    return session.consultMode;
  }

  if (field === "tags") {
    return session.responses.flatMap((response) => response.tags);
  }

  if (field.startsWith("profile.")) {
    const key = field.replace("profile.", "") as keyof UserProfile;
    return session.profileSnapshot[key];
  }

  if (field.startsWith("responses.")) {
    const nodeId = field.replace("responses.", "");
    return session.responses.find((response) => response.nodeId === nodeId)?.optionId;
  }

  return undefined;
}

function conditionMatches(session: ConsultationSession, condition: BranchCondition) {
  const currentValue = getConditionValue(session, condition.field);

  if (condition.op === "equals") {
    return currentValue === condition.value;
  }

  if (Array.isArray(currentValue)) {
    return typeof condition.value === "string" ? currentValue.includes(condition.value) : false;
  }

  return typeof currentValue === "string" && currentValue.includes(String(condition.value));
}

export function resolveNextNodeId(session: ConsultationSession, node: QuestionNode, optionId: string) {
  const option = node.options.find((candidate) => candidate.id === optionId);

  if (!option) {
    throw new Error("Unknown option: " + optionId);
  }

  if (option.next) {
    return option.next;
  }

  if (node.branchRules?.length) {
    const matched = node.branchRules.find((rule) => rule.when.every((condition) => conditionMatches(session, condition)));
    return matched?.next ?? null;
  }

  return null;
}

export function getSessionCompatibility(session: ConsultationSession): SessionCompatibility {
  const flow = getTopicFlow(session.topicId);

  if (session.flowVersion === flow.version) {
    return "ok";
  }

  const knownNodeIds = new Set(flow.nodes.map((node) => node.id));
  const responsesStillValid = session.responses.every((response) => knownNodeIds.has(response.nodeId));
  const cursorStillValid = session.currentNodeId ? knownNodeIds.has(session.currentNodeId) : true;

  return responsesStillValid && cursorStillValid ? "warning" : "outdated";
}

function normalizeConsultMode(mode?: ConsultationMode) {
  return mode === "focused" ? "focused" : "quick";
}

export function reconcileSession(session: ConsultationSession) {
  const consultMode = normalizeConsultMode(session.consultMode);
  const normalizedSession: ConsultationSession = {
    ...session,
    consultMode
  };
  const compatibility = getSessionCompatibility(normalizedSession);

  if (compatibility === "outdated" && normalizedSession.status !== "result") {
    return {
      ...normalizedSession,
      compatibility,
      status: "outdated" as const,
      currentNodeId: null
    };
  }

  return {
    ...normalizedSession,
    compatibility
  };
}

function resolveTemplate(topicId: TopicId, tags: string[]) {
  const base = TOPIC_BASE_TEMPLATES[topicId];
  const matches = SIGNAL_TEMPLATES.filter((signal) => signal.matches.some((match) => tags.includes(match)));
  const merged = matches.reduce<TopicBaseTemplate>((acc, signal) => {
    return {
      summary: signal.summary ?? acc.summary,
      currentFlow: signal.currentFlow ?? acc.currentFlow,
      self: signal.self ?? acc.self,
      other: signal.other ?? acc.other,
      structure: signal.structure ?? acc.structure,
      nearTerm: signal.nearTerm ?? acc.nearTerm,
      do: signal.do ?? acc.do,
      dont: signal.dont ?? acc.dont,
      oneLine: signal.oneLine ?? acc.oneLine,
      nextQuestions: signal.nextQuestions ?? acc.nextQuestions
    };
  }, base);

  return {
    template: merged,
    recommendedQuestions: unique([
      ...matches.flatMap((signal) => signal.nextQuestions ?? []),
      ...base.nextQuestions
    ])
  };
}

interface FocusLens {
  tag: string;
  label: string;
  detail: string;
  other: string;
  timing: string;
  action: string;
  line: string;
  questions: string[];
}

interface BlockerLens {
  tag: string;
  label: string;
  detail: string;
  self: string;
  structure: string;
  caution: string;
  questions: string[];
}

interface ToneLens {
  tag: string;
  label: string;
  detail: string;
  action: string;
  pace: string;
  line: string;
}

const DEFAULT_FOCUS_LENS: FocusLens = {
  tag: "default",
  label: "핵심 해석",
  detail: "이번 리포트는 답을 단정하기보다 흐름과 기준 차이를 선명하게 읽는 쪽에 무게를 두었습니다.",
  other: "상대나 환경은 한 번의 반응보다 반복 행동과 거리 조절 방식에서 더 많은 정보를 보여줄 수 있습니다.",
  timing: "가까운 흐름은 갑작스런 결론보다 작은 신호가 누적되며 방향을 드러낼 가능성이 큽니다.",
  action: "해석을 길게 끌기보다 지금 확인할 기준 하나와 움직일 행동 하나를 먼저 정하는 편이 좋습니다.",
  line: "답을 빨리 확정하기보다 기준을 먼저 세울수록 흐름이 더 또렷해집니다.",
  questions: ["지금 가장 먼저 확인해야 할 기준", "흐름이 바뀔 때 보이는 작은 신호"]
};

const FOCUS_LENSES: FocusLens[] = [
  {
    tag: "consult.focus.intent",
    label: "의도 파악",
    detail: "겉반응보다 속뜻과 책임감의 방향을 읽는 데 초점을 두고 리포트를 정리했습니다.",
    other: "말보다 반복 태도, 거리 조절, 책임을 지는 장면이 더 중요한 단서입니다.",
    timing: "의도는 한 번의 표현보다 반복되는 행동에서 조금 늦게 선명해질 수 있습니다.",
    action: "질문을 더하기보다 행동 일관성과 책임감을 확인하는 기준을 세우세요.",
    line: "뜻을 알고 싶을수록 말보다 책임 있는 행동을 보아야 합니다.",
    questions: ["상대가 말을 아끼는 진짜 이유", "반응보다 행동을 어떻게 읽어야 하는지"]
  },
  {
    tag: "consult.focus.timing",
    label: "시기 흐름",
    detail: "지금은 결론 자체보다 흐름이 언제 열리고 닫히는지, 어느 구간에서 속도가 바뀌는지를 읽는 것이 중요합니다.",
    other: "상대 마음보다 상황 변화와 속도 차이가 먼저 드러날 가능성이 큽니다.",
    timing: "가까운 흐름은 확답보다 반응 주기와 상황 변화의 누적으로 움직일 수 있습니다.",
    action: "당장 답을 확정하기보다 반응 주기와 외부 조건 변화를 기록해 보세요.",
    line: "시기는 확답보다 속도의 변화를 먼저 보여줍니다.",
    questions: ["가까운 1~3개월 안의 분기점", "기다려야 할 때와 움직여야 할 때"]
  },
  {
    tag: "consult.focus.action",
    label: "실행 조언",
    detail: "상황을 오래 해석하기보다 지금 흐름을 바꾸는 실질 행동과 순서에 무게를 두었습니다.",
    other: "상대를 읽는 것만으로는 부족하고, 내 행동 변화가 결과 체감을 좌우할 수 있습니다.",
    timing: "가까운 시기는 기다림보다 작은 조정을 먼저 시도할 때 체감이 빠를 수 있습니다.",
    action: "한 번에 크게 바꾸기보다 말투, 거리, 순서 중 하나부터 조정하는 편이 좋습니다.",
    line: "해석이 길어질수록 답은 흐려지고, 행동이 정리될수록 방향이 보입니다.",
    questions: ["지금 바로 바꿔야 할 행동 한 가지", "상황을 악화시키지 않으면서 움직이는 순서"]
  },
  {
    tag: "consult.focus.standard",
    label: "판단 기준",
    detail: "붙잡을지 놓을지, 이어갈지 멈출지 판단 기준을 세우는 방향으로 읽었습니다.",
    other: "상대 마음을 다 아는 것보다 내가 어디까지 허용할지 정하는 편이 더 선명합니다.",
    timing: "가까운 시기는 상대 변화보다 내 기준이 분명해지는 쪽에서 먼저 움직일 수 있습니다.",
    action: "기다릴 기간, 대화의 한계, 감당 가능한 선을 문장으로 먼저 적어 두세요.",
    line: "답이 늦을수록 기준이 먼저 있어야 흔들림이 줄어듭니다.",
    questions: ["이 관계를 계속 볼지 정하는 기준", "더 기다려도 되는 선과 멈춰야 할 선"]
  }
];

const DEFAULT_BLOCKER_LENS: BlockerLens = {
  tag: "default",
  label: "핵심 변수",
  detail: "문제 자체보다 내 해석과 외부 조건이 동시에 작동해 복잡하게 느껴질 수 있습니다.",
  self: "답을 빨리 찾고 싶은 마음이 커질수록 오히려 판단 기준이 흐려질 수 있습니다.",
  structure: "사건 하나보다 반복 반응과 해석 방식이 전체 체감을 키우는 구조입니다.",
  caution: "한 번의 장면으로 전체 결론을 확정하거나 감정이 올라온 순간 바로 행동하는 방식은 피하는 편이 좋습니다.",
  questions: ["지금 판단을 흐리는 가장 큰 변수", "반복되는 장면에서 내가 놓치는 기준"]
};

const BLOCKER_LENSES: BlockerLens[] = [
  {
    tag: "consult.blocker.emotion",
    label: "감정 흔들림",
    detail: "문제 자체보다 감정의 파도가 판단을 앞지르기 쉬운 상태입니다.",
    self: "답을 빨리 얻고 싶은 마음이 커질수록 해석이 크게 흔들릴 수 있습니다.",
    structure: "사건보다 감정 반응이 문제를 더 크게 느끼게 만드는 구조입니다.",
    caution: "불안이 올라오는 순간 바로 결론을 내리거나 메시지를 보내는 방식은 피하는 편이 좋습니다.",
    questions: ["감정이 흔들릴 때 다시 잡아야 할 기준", "불안이 커질수록 더 조심해야 할 행동"]
  },
  {
    tag: "consult.blocker.external",
    label: "외부 변수",
    detail: "상대 입장, 환경 조건, 현실 변수처럼 내 바깥의 요소가 크게 작동하고 있습니다.",
    self: "내가 노력해도 당장 바꾸기 어려운 변수 앞에서 무력감이 커질 수 있습니다.",
    structure: "감정과 의지가 있어도 현실 조건이 속도를 늦추는 구조에 가깝습니다.",
    caution: "상대 변수까지 내가 통제하려 들면 더 지치기 쉬우므로 내 범위와 바깥 변수를 나눠 봐야 합니다.",
    questions: ["내가 통제할 수 있는 부분과 없는 부분", "상황 변수가 줄어들 때 보이는 신호"]
  },
  {
    tag: "consult.blocker.pattern",
    label: "반복 패턴",
    detail: "한 번의 사건보다 비슷한 장면이 되풀이되는 구조가 핵심입니다.",
    self: "이번만 다를 거라는 기대와 실망이 번갈아 커질 가능성이 있습니다.",
    structure: "반응의 내용보다 반복되는 방식 자체가 더 중요한 단서입니다.",
    caution: "이번 장면만 떼어내 특별 취급하면 오래된 패턴을 놓치기 쉽습니다.",
    questions: ["되풀이되는 패턴을 끊으려면 무엇부터 바꿔야 하는지", "처음부터 다시 봐야 할 관계 구조"]
  },
  {
    tag: "consult.blocker.timing",
    label: "속도 압박",
    detail: "옳고 그름보다 지금 당장 판단해야 한다는 압박이 더 크게 작동하고 있습니다.",
    self: "조급함 때문에 아직 보이지 않은 부분까지 빨리 확정하고 싶어질 수 있습니다.",
    structure: "결론 부족보다 속도 압박이 해석을 흔드는 구조에 가깝습니다.",
    caution: "시간이 없다는 불안만으로 밀어붙이거나 끊어내지 않는 편이 좋습니다.",
    questions: ["지금 서두르지 말아야 하는 이유", "조금 더 지켜봐야 할 구간"]
  }
];

const DEFAULT_TONE_LENS: ToneLens = {
  tag: "default",
  label: "균형형",
  detail: "감정 정리와 현실 판단이 함께 되도록 균형감 있게 정리했습니다.",
  action: "부담을 키우지 않으면서도 기준을 흐리지 않는 작은 행동부터 시작하는 편이 좋습니다.",
  pace: "정보 확인과 감정 정리를 같이 가져가는 속도가 가장 안정적입니다.",
  line: "선명함과 안정감은 같이 갈 수 있습니다."
};

const TONE_LENSES: ToneLens[] = [
  {
    tag: "consult.tone.direct",
    label: "직설형",
    detail: "좋고 싫음을 흐리지 않고 핵심 판단을 최대한 분명하게 끊어 읽도록 정리했습니다.",
    action: "애매함을 오래 해석하기보다 기준을 빨리 세우는 편이 맞습니다.",
    pace: "반응이 오더라도 사실 확인부터 하는 속도가 좋습니다.",
    line: "불편한 답이라도 기준이 선명할수록 흔들림이 줄어듭니다."
  },
  {
    tag: "consult.tone.supportive",
    label: "정리형",
    detail: "감정 소모를 덜고 마음을 정리할 수 있도록 부담을 낮추는 방식으로 정리했습니다.",
    action: "상처를 줄이지 않은 채 결론만 밀어붙이지 않는 편이 좋습니다.",
    pace: "작게 정리하고 천천히 판단하는 속도가 맞습니다.",
    line: "정리된 마음이 먼저 생겨야 판단도 오래 갑니다."
  },
  {
    tag: "consult.tone.practical",
    label: "실행형",
    detail: "실행 순서와 현실 조언 중심으로 결과를 정리했습니다.",
    action: "상황을 바꾸는 작은 행동을 먼저 두는 편이 좋습니다.",
    pace: "정보 확인, 조건 비교, 행동 결정 순서가 가장 안전합니다.",
    line: "행동 순서가 잡히면 불안도 같이 줄어듭니다."
  }
];

function pickLens<T extends { tag: string }>(tags: string[], lenses: T[], fallback: T) {
  return lenses.find((lens) => tags.includes(lens.tag)) ?? fallback;
}

function buildResponseTrail(session: ConsultationSession) {
  return session.responses.map((response, index) => String(index + 1) + ". " + response.label).join("\n");
}

type SajuElementKey = "목" | "화" | "토" | "금" | "수";
type SajuYinYang = "양" | "음";
type SajuBirthDate = { year: number; month: number; day: number };
type SajuCardBasis = Record<ResultCard["key"], string>;

interface SajuPillar {
  stemIndex: number;
  branchIndex: number;
  stem: string;
  branch: string;
  stemElement: SajuElementKey;
  branchElement: SajuElementKey;
  yinYang: SajuYinYang;
}

interface SajuReportBasis {
  hasBirthDate: boolean;
  hasBirthTime: boolean;
  dayMasterName: string;
  pillarLine: string;
  elementLine: string;
  dominantText: string;
  weakText: string;
  balanceLine: string;
  flowLine: string;
  summaryLine: string;
  profileNote: string;
  accuracyNote?: string;
  cardBasis: SajuCardBasis;
  recommendedQuestions: string[];
}

const SAJU_HEAVENLY_STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const SAJU_EARTHLY_BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
const SAJU_STEM_ELEMENTS: SajuElementKey[] = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"];
const SAJU_BRANCH_ELEMENTS: SajuElementKey[] = ["수", "토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수"];
const SAJU_STEM_YIN_YANG: SajuYinYang[] = ["양", "음", "양", "음", "양", "음", "양", "음", "양", "음"];
const SAJU_ELEMENTS: SajuElementKey[] = ["목", "화", "토", "금", "수"];
const SAJU_DAY_MS = 24 * 60 * 60 * 1000;

const SAJU_ELEMENT_TRAITS: Record<
  SajuElementKey,
  {
    self: string;
    other: string;
    timing: string;
    action: string;
    caution: string;
    structure: string;
  }
> = {
  목: {
    self: "방향을 잡고 시작점을 만드는 힘",
    other: "관계를 넓히며 흐름을 먼저 여는 방식",
    timing: "새로운 전환 구간에서 추진력이 살아나는 패턴",
    action: "확장 1개와 유지 1개를 동시에 운영하는 루틴",
    caution: "가능성만 늘리고 결정을 미루는 습관",
    structure: "출발은 빠르지만 기준이 흐려지면 반복 피로가 커지는 구조"
  },
  화: {
    self: "의도와 감정을 선명하게 드러내는 힘",
    other: "상대 반응을 빠르게 끌어내는 전달 방식",
    timing: "표현 강도가 필요한 시점에서 성과가 커지는 패턴",
    action: "핵심 메시지 1문장 고정 후 전달 채널 단순화",
    caution: "과열된 확신으로 상대 속도를 무시하는 패턴",
    structure: "초반 가속은 빠르지만 열이 과하면 충돌이 누적되는 구조"
  },
  토: {
    self: "조건을 정리하고 기준을 고정하는 힘",
    other: "관계에서 역할과 책임을 분명히 하는 방식",
    timing: "조율과 합의가 필요한 구간에서 안정성이 올라가는 패턴",
    action: "우선순위 3가지를 숫자로 고정해 실행표에 반영",
    caution: "검토 과다로 결론을 늦추는 패턴",
    structure: "안정성은 높지만 지나치면 의사결정이 느려지는 구조"
  },
  금: {
    self: "핵심과 비핵심을 분리해 결단하는 힘",
    other: "거리와 경계를 분명히 하며 관계를 정리하는 방식",
    timing: "정리와 컷오프가 필요한 시점에서 효율이 커지는 패턴",
    action: "지킬 기준 2개와 버릴 항목 1개를 명시하는 실행",
    caution: "완벽 기준으로 타이밍을 놓치는 패턴",
    structure: "정확성은 높지만 경직되면 협업 마찰이 커지는 구조"
  },
  수: {
    self: "정보를 모아 흐름을 읽고 리스크를 낮추는 힘",
    other: "상대 의도와 맥락을 세밀하게 읽는 방식",
    timing: "탐색과 재정비 구간에서 정밀도가 올라가는 패턴",
    action: "정보 확인 루틴과 실행 마감 시점을 동시에 고정",
    caution: "과분석으로 행동을 지연시키는 패턴",
    structure: "판단 정밀도는 높지만 실행 지연이 생기기 쉬운 구조"
  }
};

function sajuMod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function parseSajuBirthDate(value: string): SajuBirthDate | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) {
    return null;
  }

  return { year, month, day };
}

function parseSajuBirthHour(value: string): number | null {
  const match = value.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return hour;
}

function buildSajuPillar(stemIndex: number, branchIndex: number): SajuPillar {
  return {
    stemIndex,
    branchIndex,
    stem: SAJU_HEAVENLY_STEMS[stemIndex],
    branch: SAJU_EARTHLY_BRANCHES[branchIndex],
    stemElement: SAJU_STEM_ELEMENTS[stemIndex],
    branchElement: SAJU_BRANCH_ELEMENTS[branchIndex],
    yinYang: SAJU_STEM_YIN_YANG[stemIndex]
  };
}

function formatSajuPillar(label: string, pillar: SajuPillar) {
  return `${label} ${pillar.stem}${pillar.branch}(${pillar.stemElement}/${pillar.branchElement}, ${pillar.yinYang})`;
}

function formatSajuElements(weights: Record<SajuElementKey, number>) {
  return SAJU_ELEMENTS.map((element) => `${element} ${weights[element].toFixed(1)}`).join(" | ");
}

function pickSajuDominantElements(weights: Record<SajuElementKey, number>) {
  const sorted = [...SAJU_ELEMENTS].sort((a, b) => weights[b] - weights[a]);
  const top = weights[sorted[0]];
  const picked = sorted.filter((element) => weights[element] >= top - 0.2).slice(0, 2);
  return picked.length > 0 ? picked : [sorted[0]];
}

function pickSajuWeakElements(weights: Record<SajuElementKey, number>, dominant: SajuElementKey[]) {
  const sorted = [...SAJU_ELEMENTS].sort((a, b) => weights[a] - weights[b]);
  const bottom = weights[sorted[0]];
  const picked = sorted.filter((element) => weights[element] <= bottom + 0.2 && !dominant.includes(element)).slice(0, 2);
  return picked.length > 0 ? picked : [sorted[0]];
}

function joinSajuElements(elements: SajuElementKey[]) {
  return unique(elements).join("·");
}

function buildSajuBalanceLine(weights: Record<SajuElementKey, number>) {
  const values = SAJU_ELEMENTS.map((element) => weights[element]);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const gap = maxValue - minValue;

  if (gap >= 2.2) {
    return "오행 편중이 커서 강한 기운 제어와 약한 기운 보완을 동시에 해야 합니다.";
  }
  if (gap >= 1.2) {
    return "오행 강약 차이가 있어 시기별로 유불리가 번갈아 나타나는 구조입니다.";
  }
  return "오행 균형이 비교적 고른 편이라 기준만 유지하면 흐름이 안정됩니다.";
}

function buildSajuFallbackBasis(profile: UserProfile): SajuReportBasis {
  const hasBirthDate = Boolean(profile.birthDate.trim());
  const fallbackLine = hasBirthDate
    ? "생년월일 형식을 확인해 주세요. 사주 명식 계산이 완료되지 않았습니다."
    : "생년월일이 없어 사주 명식 기반 리포트를 생성할 수 없습니다.";

  return {
    hasBirthDate,
    hasBirthTime: false,
    dayMasterName: "미확정",
    pillarLine: fallbackLine,
    elementLine: fallbackLine,
    dominantText: "미확정",
    weakText: "미확정",
    balanceLine: fallbackLine,
    flowLine: fallbackLine,
    summaryLine: fallbackLine,
    profileNote: fallbackLine,
    accuracyNote: "생년월일과 출생시간을 입력하면 모든 리포트를 사주 근거로 다시 계산합니다.",
    cardBasis: {
      summary: fallbackLine,
      currentFlow: fallbackLine,
      self: fallbackLine,
      other: fallbackLine,
      structure: fallbackLine,
      nearTerm: fallbackLine,
      do: fallbackLine,
      dont: fallbackLine,
      oneLine: fallbackLine,
      followUp: "생년월일 입력 후 사주 확인 질문이 생성됩니다."
    },
    recommendedQuestions: [
      "사주 리포트를 위해 생년월일 입력 형식을 확인했나요?",
      "출생시간을 알면 시주까지 포함해 정밀도가 올라갑니다.",
      "양력/음력 기준을 올바르게 선택했는지 확인했나요?"
    ]
  };
}

function deriveSajuReportBasis(profile: UserProfile): SajuReportBasis {
  const birth = parseSajuBirthDate(profile.birthDate);
  if (!birth) {
    return buildSajuFallbackBasis(profile);
  }

  const yearStemIndex = sajuMod(birth.year - 4, 10);
  const yearBranchIndex = sajuMod(birth.year - 4, 12);
  const monthBranchIndex = birth.month % 12;
  const monthBaseStemIndex = sajuMod(yearStemIndex * 2 + 2, 10);
  const monthStemIndex = sajuMod(monthBaseStemIndex + sajuMod(monthBranchIndex - 2, 12), 10);

  const referenceUtc = Date.UTC(1984, 1, 2);
  const targetUtc = Date.UTC(birth.year, birth.month - 1, birth.day);
  const dayOffset = Math.floor((targetUtc - referenceUtc) / SAJU_DAY_MS);
  const dayCycleIndex = sajuMod(dayOffset, 60);
  const dayStemIndex = sajuMod(dayCycleIndex, 10);
  const dayBranchIndex = sajuMod(dayCycleIndex, 12);

  const yearPillar = buildSajuPillar(yearStemIndex, yearBranchIndex);
  const monthPillar = buildSajuPillar(monthStemIndex, monthBranchIndex);
  const dayPillar = buildSajuPillar(dayStemIndex, dayBranchIndex);

  let hourPillar: SajuPillar | null = null;
  let hasBirthTime = false;
  if (!profile.birthTimeUnknown && profile.birthTime.trim()) {
    const hour = parseSajuBirthHour(profile.birthTime);
    if (hour !== null) {
      hasBirthTime = true;
      const hourBranchIndex = sajuMod(Math.floor((hour + 1) / 2), 12);
      const hourStemStart = sajuMod((dayStemIndex % 5) * 2, 10);
      const hourStemIndex = sajuMod(hourStemStart + hourBranchIndex, 10);
      hourPillar = buildSajuPillar(hourStemIndex, hourBranchIndex);
    }
  }

  const weights: Record<SajuElementKey, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const addWeight = (element: SajuElementKey, amount: number) => {
    weights[element] += amount;
  };

  addWeight(yearPillar.stemElement, 1);
  addWeight(yearPillar.branchElement, 1);
  addWeight(monthPillar.stemElement, 1.2);
  addWeight(monthPillar.branchElement, 2);
  addWeight(dayPillar.stemElement, 2);
  addWeight(dayPillar.branchElement, 1.2);
  if (hourPillar) {
    addWeight(hourPillar.stemElement, 1);
    addWeight(hourPillar.branchElement, 1);
  }

  const dominantElements = pickSajuDominantElements(weights);
  const weakElements = pickSajuWeakElements(weights, dominantElements);
  const dominantText = joinSajuElements(dominantElements);
  const weakText = joinSajuElements(weakElements);
  const dayMasterName = `${dayPillar.stem}${dayPillar.stemElement}`;
  const dayTrait = SAJU_ELEMENT_TRAITS[dayPillar.stemElement];
  const dominantTrait = SAJU_ELEMENT_TRAITS[dominantElements[0]];
  const weakTrait = SAJU_ELEMENT_TRAITS[weakElements[0]];
  const monthElement = monthPillar.branchElement;
  const monthTrait = SAJU_ELEMENT_TRAITS[monthElement];

  const pillarLine = [
    formatSajuPillar("연주", yearPillar),
    formatSajuPillar("월주", monthPillar),
    formatSajuPillar("일주", dayPillar),
    hourPillar ? formatSajuPillar("시주", hourPillar) : "시주 미반영(출생시간 미입력)"
  ].join(" | ");
  const elementLine = `오행 분포: ${formatSajuElements(weights)}`;
  const balanceLine = buildSajuBalanceLine(weights);
  const flowLine = `월지 ${monthPillar.branch}(${monthElement})를 현재 흐름 축으로 보며, ${monthTrait.timing}`;
  const summaryLine = `일간 ${dayMasterName} 기준 ${dominantText} 강세, ${weakText} 보완이 핵심입니다.`;

  const cardBasis: SajuCardBasis = {
    summary: `${summaryLine} ${balanceLine}`,
    currentFlow: `${flowLine} 강한 기운은 ${dominantText}, 약한 기운은 ${weakText}입니다.`,
    self: `일간 ${dayMasterName}의 핵심 과제는 ${dayTrait.self}입니다. ${balanceLine}`,
    other: `${dominantText} 기운이 대인 반응을 주도하며 ${dominantTrait.other}가 반복됩니다.`,
    structure: `${elementLine} 구조상 ${dominantText} 과다와 ${weakText} 부족이 핵심 축입니다. ${dayTrait.structure}`,
    nearTerm: `${flowLine} 단기에는 월령과 같은 성질의 선택이 유리합니다.`,
    do: `${weakText} 보강 행동은 ${weakTrait.action}입니다.`,
    dont: `${dominantText} 과다 구간에서는 ${dominantTrait.caution}을 피해야 합니다.`,
    oneLine: `일간 ${dayMasterName}, 강점 ${dominantText}, 보완 ${weakText}를 기준으로 선택하면 흐름이 안정됩니다.`,
    followUp: `후속 질문은 일간 ${dayMasterName}의 강약 조절과 ${weakText} 보완 검증을 목표로 구성했습니다.`
  };

  const recommendedQuestions = [
    `일간 ${dayMasterName} 기준으로 지금 가장 무리한 선택은 무엇인가요?`,
    `${weakElements[0]} 기운을 보완하려면 이번 주에 줄여야 할 행동은 무엇인가요?`,
    `${dominantElements[0]} 기운 과다로 반복되는 관계 패턴은 무엇인가요?`,
    `월지 ${monthPillar.branch} 흐름 전환 시점에 확인할 지표는 무엇인가요?`
  ];

  const calendarLabel = profile.birthCalendar === "lunar" ? "음력" : "양력";
  const profileNote = hasBirthTime
    ? `${profile.birthDate} ${calendarLabel}, ${profile.birthTime} 기준 연·월·일·시 명식을 반영했습니다.`
    : `${profile.birthDate} ${calendarLabel} 기준 연·월·일 명식을 반영했고 시주는 제외했습니다.`;

  return {
    hasBirthDate: true,
    hasBirthTime,
    dayMasterName,
    pillarLine,
    elementLine,
    dominantText,
    weakText,
    balanceLine,
    flowLine,
    summaryLine,
    profileNote,
    accuracyNote: hasBirthTime ? undefined : "출생시간이 없어 시주 제외(연·월·일 기준)로 해석했습니다.",
    cardBasis,
    recommendedQuestions
  };
}

function buildSajuDynamicQuestions(tags: string[], sajuBasis: SajuReportBasis) {
  const focus = pickLens(tags, FOCUS_LENSES, DEFAULT_FOCUS_LENS);
  const blocker = pickLens(tags, BLOCKER_LENSES, DEFAULT_BLOCKER_LENS);
  return unique([...sajuBasis.recommendedQuestions, ...focus.questions, ...blocker.questions]);
}

function buildSajuCards(
  template: TopicBaseTemplate,
  recommendedQuestions: string[],
  session: ConsultationSession,
  tags: string[],
  sajuBasis: SajuReportBasis
): ResultCard[] {
  const focus = pickLens(tags, FOCUS_LENSES, DEFAULT_FOCUS_LENS);
  const blocker = pickLens(tags, BLOCKER_LENSES, DEFAULT_BLOCKER_LENS);
  const tone = pickLens(tags, TONE_LENSES, DEFAULT_TONE_LENS);
  const responseTrail = buildResponseTrail(session) || "선택 응답이 아직 없습니다.";
  const modeSummary =
    session.consultMode === "focused"
      ? "집중해 보기 모드로 사주 근거와 보정 근거를 세분화했습니다."
      : "간단하게 보기 모드로 사주 핵심 근거를 우선 요약했습니다.";
  const modeDetail =
    session.consultMode === "focused"
      ? "집중 모드는 카드마다 사주 근거와 상담 보정을 함께 노출합니다."
      : "간단 모드는 사주 핵심 축 중심으로 압축 표시합니다.";
  const followUpLines =
    recommendedQuestions.length > 0
      ? recommendedQuestions
      : ["생년월일을 입력하면 사주 확인 질문이 자동 생성됩니다."];

  return [
    {
      key: "summary",
      title: RESULT_CARD_TITLES.summary,
      body: [
        section("사주 명식", sajuBasis.pillarLine),
        section("사주 근거", sajuBasis.cardBasis.summary),
        section("오행 분포", sajuBasis.elementLine),
        section("상담 보정", template.summary),
        section("해석 모드", modeSummary)
      ].join("\n\n")
    },
    {
      key: "currentFlow",
      title: RESULT_CARD_TITLES.currentFlow,
      body: [
        section("사주 근거", sajuBasis.cardBasis.currentFlow),
        section("상담 보정", template.currentFlow),
        section("병목 포인트", blocker.detail),
        section("시기 포인트", focus.timing)
      ].join("\n\n")
    },
    {
      key: "self",
      title: RESULT_CARD_TITLES.self,
      body: [
        section("사주 근거", sajuBasis.cardBasis.self),
        section("내 상태 보정", template.self),
        section("흔들리는 지점", blocker.self),
        section("프로필 반영", sajuBasis.profileNote)
      ].join("\n\n")
    },
    {
      key: "other",
      title: RESULT_CARD_TITLES.other,
      body: [
        section("사주 근거", sajuBasis.cardBasis.other),
        section("상대/환경 보정", template.other),
        section("읽는 기준", focus.other),
        section("주의 신호", blocker.caution)
      ].join("\n\n")
    },
    {
      key: "structure",
      title: RESULT_CARD_TITLES.structure,
      body: [
        section("사주 근거", sajuBasis.cardBasis.structure),
        section("문제 구조 보정", template.structure),
        section("응답 요약", responseTrail),
        section("모드별 깊이", modeDetail)
      ].join("\n\n")
    },
    {
      key: "nearTerm",
      title: RESULT_CARD_TITLES.nearTerm,
      body: [
        section("사주 근거", sajuBasis.cardBasis.nearTerm),
        section("단기 흐름 보정", template.nearTerm),
        section("리듬 가이드", tone.pace)
      ].join("\n\n")
    },
    {
      key: "do",
      title: RESULT_CARD_TITLES.do,
      body: [
        section("사주 근거", sajuBasis.cardBasis.do),
        section("실행 보정", template.do),
        section("실행 디테일", focus.action),
        section("추천 접근", tone.action)
      ].join("\n\n")
    },
    {
      key: "dont",
      title: RESULT_CARD_TITLES.dont,
      body: [
        section("사주 근거", sajuBasis.cardBasis.dont),
        section("회피 포인트 보정", template.dont),
        section("주의 패턴", blocker.caution),
        section("기억할 기준", focus.line)
      ].join("\n\n")
    },
    {
      key: "oneLine",
      title: RESULT_CARD_TITLES.oneLine,
      body: [
        section("사주 근거", sajuBasis.cardBasis.oneLine),
        section("한 줄 요약", template.oneLine),
        section("리포트 코어", tone.line)
      ].join("\n\n")
    },
    {
      key: "followUp",
      title: RESULT_CARD_TITLES.followUp,
      body: [
        section(
          "사주 확인 질문",
          followUpLines.map((question, index) => `${index + 1}. ${question}`).join("\n")
        ),
        section("질문 설계 근거", sajuBasis.cardBasis.followUp)
      ].join("\n\n")
    }
  ];
}

function buildProfileNote(profile: UserProfile) {
  if (!profile.birthDate) {
    return "빠른 시작 모드로 생성한 리포트입니다. 생년월일과 출생시간을 추가하면 시기감과 문장 디테일을 더 촘촘하게 조정할 수 있습니다.";
  }

  if (profile.birthTimeUnknown || !profile.birthTime) {
    return "생년월일은 반영했지만 출생시간이 비어 있어 세부 시기보다 큰 흐름과 구조 중심으로 해석했습니다.";
  }

  return profile.birthDate + " " + profile.birthTime + " 기준으로 기본 프로필을 함께 반영했습니다.";
}

function buildAccuracyNote(profile: UserProfile) {
  if (!profile.birthDate) {
    return "빠른 시작 모드로 생성한 리포트입니다. 생년월일과 출생시간을 입력하면 시기감과 문장 디테일을 더 보강할 수 있습니다.";
  }

  if (profile.birthTimeUnknown || !profile.birthTime) {
    return "출생시간을 모르는 상태라 세부 시기감보다 큰 흐름 위주로 해석했습니다.";
  }

  return undefined;
}

function buildDynamicQuestions(tags: string[]) {
  const focus = pickLens(tags, FOCUS_LENSES, DEFAULT_FOCUS_LENS);
  const blocker = pickLens(tags, BLOCKER_LENSES, DEFAULT_BLOCKER_LENS);

  return unique([...focus.questions, ...blocker.questions]);
}

function buildCards(
  template: TopicBaseTemplate,
  recommendedQuestions: string[],
  session: ConsultationSession,
  tags: string[]
): ResultCard[] {
  const focus = pickLens(tags, FOCUS_LENSES, DEFAULT_FOCUS_LENS);
  const blocker = pickLens(tags, BLOCKER_LENSES, DEFAULT_BLOCKER_LENS);
  const tone = pickLens(tags, TONE_LENSES, DEFAULT_TONE_LENS);
  const responseTrail = buildResponseTrail(session);
  const profileNote = buildProfileNote(session.profileSnapshot);
  const modeSummary =
    session.consultMode === "focused"
      ? "집중해서 보기 모드로 생성되어 현재 상태, 맥락, 반복 패턴, 실행 전략을 더 깊게 반영했습니다."
      : "간단하게 보기 모드로 생성되어 핵심 흐름과 즉시 행동 중심으로 빠르게 정리했습니다.";
  const modeDetail =
    session.consultMode === "focused"
      ? "문항이 늘어난 만큼 결과 해석도 근거 신호와 맥락을 더 세분화해 구성했습니다."
      : "짧은 문항 수에 맞춰 해석은 핵심 신호 중심으로 압축해 제공했습니다.";

  return [
    {
      key: "summary",
      title: RESULT_CARD_TITLES.summary,
      body: [
        section("현재 진단", template.summary),
        section("해석 모드", modeSummary),
        section("이번 상담의 초점", focus.label + " 중심으로 리포트를 정리했습니다. " + focus.detail),
        section("리포트 기준", tone.detail)
      ].join("\n\n")
    },
    {
      key: "currentFlow",
      title: RESULT_CARD_TITLES.currentFlow,
      body: [
        section("흐름 해석", template.currentFlow),
        section("지금 크게 작동하는 변수", blocker.detail),
        section("가까이서 볼 포인트", focus.timing)
      ].join("\n\n")
    },
    {
      key: "self",
      title: RESULT_CARD_TITLES.self,
      body: [
        section("내 상태", template.self),
        section("내가 흔들리는 지점", blocker.self),
        section("프로필 반영", profileNote)
      ].join("\n\n")
    },
    {
      key: "other",
      title: RESULT_CARD_TITLES.other,
      body: [
        section("상대/환경 반응", template.other),
        section("읽는 기준", focus.other),
        section("주의할 오해", blocker.caution)
      ].join("\n\n")
    },
    {
      key: "structure",
      title: RESULT_CARD_TITLES.structure,
      body: [
        section("문제 구조", template.structure),
        section("모드별 해석 깊이", modeDetail),
        section("답변 요약", responseTrail),
        section("반복 패턴", blocker.structure)
      ].join("\n\n")
    },
    {
      key: "nearTerm",
      title: RESULT_CARD_TITLES.nearTerm,
      body: [
        section("가까운 시기", template.nearTerm),
        section("시기 해석", focus.timing),
        section("지금 필요한 속도", tone.pace)
      ].join("\n\n")
    },
    {
      key: "do",
      title: RESULT_CARD_TITLES.do,
      body: [
        section("우선 행동", template.do),
        section("실행 포인트", focus.action),
        section("추천 접근", tone.action)
      ].join("\n\n")
    },
    {
      key: "dont",
      title: RESULT_CARD_TITLES.dont,
      body: [
        section("피해야 할 패턴", template.dont),
        section("지금 특히 주의", blocker.caution),
        section("흔들릴 때 기억할 기준", focus.line)
      ].join("\n\n")
    },
    {
      key: "oneLine",
      title: RESULT_CARD_TITLES.oneLine,
      body: [
        section("핵심 문장", template.oneLine),
        section("이번 리포트 한 줄 정리", tone.line),
        section("상담의 핵심 축", focus.line)
      ].join("\n\n")
    },
    {
      key: "followUp",
      title: RESULT_CARD_TITLES.followUp,
      body: recommendedQuestions.map((question, index) => String(index + 1) + ". " + question).join("\n")
    }
  ];
}

export function buildConsultationResult(
  session: ConsultationSession,
  generationSource: ResultGenerationSource = "local"
): ConsultationResult {
  const tags = unique(session.responses.flatMap((response) => response.tags));
  const sajuBasis = deriveSajuReportBasis(session.profileSnapshot);
  const { template, recommendedQuestions: templateQuestions } = resolveTemplate(session.topicId, tags);
  const questionLimit = session.consultMode === "focused" ? 6 : 4;
  const recommendedQuestions = unique([...templateQuestions, ...buildSajuDynamicQuestions(tags, sajuBasis)]).slice(
    0,
    questionLimit
  );

  return {
    id: makeId("result"),
    sessionId: session.id,
    topicId: session.topicId,
    summary: sajuBasis.hasBirthDate ? sajuBasis.summaryLine : template.summary,
    cards: buildSajuCards(template, recommendedQuestions, session, tags, sajuBasis),
    recommendedQuestions,
    tags,
    generatedAt: new Date().toISOString(),
    generationSource,
    accuracyNote: sajuBasis.accuracyNote ?? buildAccuracyNote(session.profileSnapshot)
  };
}

export function buildFallbackResult(session: ConsultationSession): ConsultationResult {
  return buildConsultationResult(session, "fallback");
}
