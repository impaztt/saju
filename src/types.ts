export type TopicId =
  | "romance"
  | "reunion"
  | "marriage"
  | "chemistry"
  | "relationships"
  | "family"
  | "career"
  | "money"
  | "yearly"
  | "mind";

export type BirthCalendar = "solar" | "lunar";
export type Gender = "female" | "male" | "other";
export type QuestionType = "single_select" | "binary" | "multi_select";
export type SessionStatus = "draft" | "review" | "loading" | "result" | "outdated";
export type SessionCompatibility = "ok" | "warning" | "outdated";
export type ShareStatus = "active" | "expired" | "disabled";
export type ResultGenerationSource = "local" | "fallback" | "cloud";
export type BannerTone = "info" | "warning" | "notice";
export type NetworkStatus = "online" | "offline";
export type ResultCardKey =
  | "summary"
  | "currentFlow"
  | "self"
  | "other"
  | "structure"
  | "nearTerm"
  | "do"
  | "dont"
  | "oneLine"
  | "followUp";

export interface TopicDefinition {
  id: TopicId;
  label: string;
  description: string;
  shortBlurb: string;
  featuredPrompt: string;
  accent: string;
  estimatedMinutes: number;
}

export interface UserProfile {
  nickname: string;
  birthDate: string;
  birthCalendar: BirthCalendar;
  birthTime: string;
  birthTimeUnknown: boolean;
  gender: Gender;
}

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
  next: string | null;
  tags: string[];
}

export interface BranchCondition {
  field: string;
  op: "equals" | "includes";
  value: string | boolean;
}

export interface BranchRule {
  id: string;
  when: BranchCondition[];
  next: string | null;
}

export interface QuestionNode {
  id: string;
  topicId: TopicId;
  version: string;
  prompt: string;
  helper?: string;
  type: QuestionType;
  options: QuestionOption[];
  branchRules?: BranchRule[];
  resultTags?: string[];
}

export interface TopicFlow {
  topicId: TopicId;
  version: string;
  startNodeId: string;
  nodes: QuestionNode[];
}

export interface SessionResponse {
  nodeId: string;
  optionId: string;
  label: string;
  tags: string[];
  answeredAt: string;
}

export interface ResultCard {
  key: ResultCardKey;
  title: string;
  body: string;
}

export interface ConsultationResult {
  id: string;
  sessionId: string;
  topicId: TopicId;
  summary: string;
  cards: ResultCard[];
  recommendedQuestions: string[];
  tags: string[];
  generatedAt: string;
  generationSource: ResultGenerationSource;
  accuracyNote?: string;
}

export interface ConsultationSession {
  id: string;
  userId: string;
  profileSnapshot: UserProfile;
  topicId: TopicId;
  flowVersion: string;
  status: SessionStatus;
  currentNodeId: string | null;
  responses: SessionResponse[];
  compatibility: SessionCompatibility;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  saved: boolean;
  resultId?: string;
  shareToken?: string;
}

export interface ShareRecord {
  token: string;
  userId: string;
  sessionId: string;
  resultId: string;
  status: ShareStatus;
  expiresAt: string;
  createdAt: string;
  urlPath: string;
}

export interface AppBanner {
  id: string;
  title: string;
  body: string;
  tone: BannerTone;
  actionLabel?: string;
  actionPath?: string;
}
