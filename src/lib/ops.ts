import { TOPIC_FLOWS } from "../data/questionFlows";
import { TOPICS } from "../data/topics";
import type { ConsultationSession } from "../types";

export interface TopicMetric {
  topicId: string;
  label: string;
  entries: number;
  completed: number;
  saved: number;
  completionRate: number;
  saveRate: number;
}

export interface QuestionMetric {
  topicId: string;
  nodeId: string;
  prompt: string;
  answered: number;
  pendingDropouts: number;
  dropoutRate: number;
}

export function computeTopicMetrics(sessions: ConsultationSession[]) {
  return TOPICS.map<TopicMetric>((topic) => {
    const topicSessions = sessions.filter((session) => session.topicId === topic.id);
    const entries = topicSessions.length;
    const completed = topicSessions.filter((session) => session.status === "result").length;
    const saved = topicSessions.filter((session) => session.saved).length;

    return {
      topicId: topic.id,
      label: topic.label,
      entries,
      completed,
      saved,
      completionRate: entries ? Math.round((completed / entries) * 100) : 0,
      saveRate: entries ? Math.round((saved / entries) * 100) : 0
    };
  });
}

export function computeQuestionMetrics(sessions: ConsultationSession[]) {
  return TOPIC_FLOWS.flatMap<QuestionMetric>((flow) => {
    return flow.nodes.map((node) => {
      const answered = sessions.filter((session) => session.responses.some((response) => response.nodeId === node.id)).length;
      const pendingDropouts = sessions.filter(
        (session) => session.status !== "result" && session.currentNodeId === node.id
      ).length;
      const attempts = answered + pendingDropouts;

      return {
        topicId: flow.topicId,
        nodeId: node.id,
        prompt: node.prompt,
        answered,
        pendingDropouts,
        dropoutRate: attempts ? Math.round((pendingDropouts / attempts) * 100) : 0
      };
    });
  });
}
