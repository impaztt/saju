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

function makeId(prefix: string) {
  return prefix + "-" + crypto.randomUUID();
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

function getRemainingDepth(flow: TopicFlow, nodeId: string | null, seen = new Set<string>()): number {
  if (!nodeId || seen.has(nodeId)) {
    return 0;
  }

  const node = getNode(flow, nodeId);

  if (!node) {
    return 0;
  }

  const nextSeen = new Set(seen);
  nextSeen.add(nodeId);

  const optionDepths: number[] = node.options.map((option) => getRemainingDepth(flow, option.next, nextSeen));
  const branchDepths: number[] = node.branchRules?.map((rule) => getRemainingDepth(flow, rule.next, nextSeen)) ?? [];

  return 1 + Math.max(0, ...optionDepths, ...branchDepths);
}

export function getProgressPercent(session: ConsultationSession) {
  const flow = getTopicFlow(session.topicId);
  const total = session.currentNodeId
    ? Math.max(session.responses.length + getRemainingDepth(flow, session.currentNodeId), 1)
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
  const { template, recommendedQuestions: templateQuestions } = resolveTemplate(session.topicId, tags);
  const questionLimit = session.consultMode === "focused" ? 6 : 4;
  const recommendedQuestions = unique([...templateQuestions, ...buildDynamicQuestions(tags)]).slice(
    0,
    questionLimit
  );

  return {
    id: makeId("result"),
    sessionId: session.id,
    topicId: session.topicId,
    summary: template.summary,
    cards: buildCards(template, recommendedQuestions, session, tags),
    recommendedQuestions,
    tags,
    generatedAt: new Date().toISOString(),
    generationSource,
    accuracyNote: buildAccuracyNote(session.profileSnapshot)
  };
}

export function buildFallbackResult(session: ConsultationSession): ConsultationResult {
  return buildConsultationResult(session, "fallback");
}
