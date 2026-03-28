import { FLOW_MAP } from "../data/questionFlows";
import {
  RESULT_CARD_TITLES,
  SIGNAL_TEMPLATES,
  TOPIC_BASE_TEMPLATES,
  type TopicBaseTemplate
} from "../data/resultTemplates";
import type {
  BranchCondition,
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
  return `${prefix}-${crypto.randomUUID()}`;
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

export function getProgressPercent(session: ConsultationSession) {
  const total = Math.max(getTopicFlow(session.topicId).nodes.length, 1);
  const current = session.currentNodeId ? Math.min(session.responses.length + 1, total) : session.responses.length;

  return Math.round((current / total) * 100);
}

function getConditionValue(session: ConsultationSession, field: string) {
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

export function resolveNextNodeId(
  session: ConsultationSession,
  node: QuestionNode,
  optionId: string
) {
  const option = node.options.find((candidate) => candidate.id === optionId);

  if (!option) {
    throw new Error(`Unknown option: ${optionId}`);
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

export function reconcileSession(session: ConsultationSession) {
  const compatibility = getSessionCompatibility(session);

  if (compatibility === "outdated" && session.status !== "result") {
    return {
      ...session,
      compatibility,
      status: "outdated" as const,
      currentNodeId: null
    };
  }

  return {
    ...session,
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
    ]).slice(0, 3)
  };
}

function buildCards(template: TopicBaseTemplate, recommendedQuestions: string[]): ResultCard[] {
  return [
    { key: "summary", title: RESULT_CARD_TITLES.summary, body: template.summary },
    { key: "currentFlow", title: RESULT_CARD_TITLES.currentFlow, body: template.currentFlow },
    { key: "self", title: RESULT_CARD_TITLES.self, body: template.self },
    { key: "other", title: RESULT_CARD_TITLES.other, body: template.other },
    { key: "structure", title: RESULT_CARD_TITLES.structure, body: template.structure },
    { key: "nearTerm", title: RESULT_CARD_TITLES.nearTerm, body: template.nearTerm },
    { key: "do", title: RESULT_CARD_TITLES.do, body: template.do },
    { key: "dont", title: RESULT_CARD_TITLES.dont, body: template.dont },
    { key: "oneLine", title: RESULT_CARD_TITLES.oneLine, body: template.oneLine },
    {
      key: "followUp",
      title: RESULT_CARD_TITLES.followUp,
      body: recommendedQuestions.map((question) => `• ${question}`).join("\n")
    }
  ];
}

export function buildConsultationResult(
  session: ConsultationSession,
  generationSource: ResultGenerationSource = "local"
): ConsultationResult {
  const tags = unique(session.responses.flatMap((response) => response.tags));
  const { template, recommendedQuestions } = resolveTemplate(session.topicId, tags);

  return {
    id: makeId("result"),
    sessionId: session.id,
    topicId: session.topicId,
    summary: template.summary,
    cards: buildCards(template, recommendedQuestions),
    recommendedQuestions,
    tags,
    generatedAt: new Date().toISOString(),
    generationSource,
    accuracyNote: session.profileSnapshot.birthTimeUnknown
      ? "출생시간을 모르는 상태라 세부 시기감보다 큰 흐름 위주로 해석했습니다."
      : undefined
  };
}

export function buildFallbackResult(session: ConsultationSession): ConsultationResult {
  return buildConsultationResult(session, "fallback");
}
