import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom";

import { FLOW_MAP } from "../data/questionFlows";
import { SIGNAL_TEMPLATES } from "../data/resultTemplates";
import { TOPICS } from "../data/topics";
import { getNode, getProgressPercent } from "../lib/engine";
import { computeQuestionMetrics, computeTopicMetrics } from "../lib/ops";
import { isShareExpired } from "../lib/share";
import { isSupabaseConfigured, type CloudAuthProvider } from "../lib/supabase";
import { useAppStore } from "../store/useAppStore";
import type {
  ConsultationMode,
  ConsultationResult,
  ConsultationSession,
  ResultCard,
  ResultCardKey,
  ShareRecord,
  TopicDefinition,
  TopicId,
  UserProfile
} from "../types";

type IconName =
  | "archive"
  | "arrowLeft"
  | "arrowRight"
  | "chart"
  | "check"
  | "clock"
  | "cloud"
  | "edit"
  | "home"
  | "link"
  | "network"
  | "play"
  | "profile"
  | "save"
  | "settings"
  | "share"
  | "spark"
  | "trash"
  | "warning";

type TopicGroupId = "relationship" | "reality" | "self";

type TopicGroup = {
  id: TopicGroupId;
  label: string;
  description: string;
  topics: TopicId[];
};

type ParsedSection = {
  title: string;
  body: string;
};

const TOPIC_GROUPS: TopicGroup[] = [
  {
    id: "relationship",
    label: "관계",
    description: "사람과 마음의 온도를 확인해요.",
    topics: ["romance", "chemistry", "reunion", "marriage", "relationships", "family"]
  },
  {
    id: "reality",
    label: "현실",
    description: "일, 돈, 선택의 기준을 정리해요.",
    topics: ["career", "money"]
  },
  {
    id: "self",
    label: "나",
    description: "올해 흐름과 마음의 방향을 봐요.",
    topics: ["yearly", "mind"]
  }
];

const FEATURED_TOPIC_IDS: TopicId[] = ["romance", "career", "mind", "yearly"];
const BRAND_NAME = "하루결";
const BRAND_TAGLINE = "사주로 보는 오늘의 한 줄";

const ENTRY_POINTS: Array<{
  id: string;
  label: string;
  line: string;
  topicId: TopicId;
}> = [
  {
    id: "love",
    label: "사랑",
    line: "연애와 관계의 사주 흐름",
    topicId: "romance"
  },
  {
    id: "work",
    label: "일",
    line: "일과 돈의 움직임",
    topicId: "career"
  },
  {
    id: "mind",
    label: "마음",
    line: "올해 운과 마음의 방향",
    topicId: "mind"
  }
];

const RESULT_CARD_DESCRIPTIONS: Record<ResultCardKey, string> = {
  summary: "핵심 흐름",
  currentFlow: "지금의 방향",
  self: "내 상태",
  other: "상대/환경",
  structure: "문제 구조",
  nearTerm: "가까운 시기",
  do: "해야 할 행동",
  dont: "피해야 할 패턴",
  oneLine: "오늘의 문장",
  followUp: "다음 질문"
};

function topicById(topicId: TopicId) {
  return TOPICS.find((topic) => topic.id === topicId) as TopicDefinition;
}

function topicStyle(topic: TopicDefinition): CSSProperties {
  return { "--accent": topic.accent } as CSSProperties;
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function calendarLabel(value: UserProfile["birthCalendar"]) {
  return value === "solar" ? "양력" : "음력";
}

function genderLabel(value: UserProfile["gender"]) {
  if (value === "female") {
    return "여성";
  }
  if (value === "male") {
    return "남성";
  }
  return "기타";
}

function modeLabel(mode: ConsultationMode) {
  return mode === "focused" ? "깊게 보기" : "빠른 해석";
}

function modeQuestionRange(mode: ConsultationMode) {
  return mode === "focused" ? "15~22문항" : "5~9문항";
}

function modeEstimatedMinutes(topic: TopicDefinition, mode: ConsultationMode) {
  return mode === "focused" ? topic.estimatedMinutes + 8 : topic.estimatedMinutes;
}

function sourceLabel(source: ConsultationResult["generationSource"]) {
  if (source === "cloud") {
    return "클라우드";
  }
  if (source === "fallback") {
    return "기본 결과";
  }
  return "로컬 생성";
}

function cloudAuthLabel(provider: CloudAuthProvider | null) {
  if (provider === "kakao") {
    return "카카오";
  }
  if (provider === "email") {
    return "이메일";
  }
  if (provider === "anonymous") {
    return "익명";
  }
  if (provider === "other") {
    return "외부 계정";
  }
  return "미연결";
}

function formatProfileSummary(profile: UserProfile) {
  const parts: string[] = [];

  if (profile.nickname.trim()) {
    parts.push(profile.nickname.trim());
  }
  if (profile.birthDate) {
    parts.push(`${profile.birthDate} ${calendarLabel(profile.birthCalendar)}`);
    parts.push(profile.birthTimeUnknown ? "출생시간 모름" : profile.birthTime || "출생시간 미입력");
  }
  if (profile.gender !== "other") {
    parts.push(genderLabel(profile.gender));
  }

  return parts.length > 0
    ? parts.join(" · ")
    : "사주정보가 아직 없습니다. 생년월일을 먼저 입력해야 결과를 만들 수 있습니다.";
}

function hasSajuProfile(profile: UserProfile) {
  return Boolean(profile.birthDate.trim() && (profile.birthTimeUnknown || profile.birthTime.trim()));
}

function resultPath(resultId: string) {
  return `/result/${resultId}`;
}

function sessionPath(session: ConsultationSession) {
  if (session.status === "result" && session.resultId) {
    return resultPath(session.resultId);
  }
  if (session.status === "review") {
    return `/review/${session.id}`;
  }
  if (session.status === "loading") {
    return `/loading/${session.id}`;
  }
  return `/session/${session.id}`;
}

function absoluteShareUrl(path: string) {
  if (typeof window === "undefined") {
    return path;
  }
  return new URL(path, window.location.origin).toString();
}

function latestOpenSession(sessions: ConsultationSession[]) {
  return [...sessions]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .find((session) => ["draft", "review", "loading"].includes(session.status) && session.compatibility !== "outdated");
}

function latestSavedResult(results: ConsultationResult[], sessions: ConsultationSession[]) {
  return [...results]
    .map((result) => ({
      result,
      session: sessions.find((session) => session.resultId === result.id)
    }))
    .filter((entry) => Boolean(entry.session?.saved))
    .sort((a, b) => b.result.generatedAt.localeCompare(a.result.generatedAt))[0];
}

function parseCardSections(card?: ResultCard): ParsedSection[] {
  if (!card) {
    return [];
  }

  return card.body
    .split(/\n{2,}/)
    .map((block) => {
      const match = block.match(/^\[(.+?)\]\n([\s\S]*)$/);
      if (match) {
        return { title: match[1], body: match[2].trim() };
      }
      return { title: card.title, body: block.trim() };
    })
    .filter((section) => section.body.length > 0);
}

function cardByKey(result: ConsultationResult, key: ResultCardKey) {
  return result.cards.find((card) => card.key === key);
}

function cardLead(card?: ResultCard) {
  const section = parseCardSections(card)[0];
  const text = section?.body ?? card?.body ?? "";
  return text.split("\n").find(Boolean) ?? "";
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

function IconBase({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={["ui-icon", className].filter(Boolean).join(" ")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function UiIcon({ name, className }: { name: IconName; className?: string }) {
  switch (name) {
    case "archive":
      return (
        <IconBase className={className}>
          <path d="M3 8h18v12H3z" />
          <path d="M1 4h22v4H1z" />
          <path d="M10 12h4" />
        </IconBase>
      );
    case "arrowLeft":
      return (
        <IconBase className={className}>
          <path d="m15 18-6-6 6-6" />
        </IconBase>
      );
    case "arrowRight":
      return (
        <IconBase className={className}>
          <path d="m9 18 6-6-6-6" />
        </IconBase>
      );
    case "chart":
      return (
        <IconBase className={className}>
          <path d="M4 20h16" />
          <path d="M7 16v-4" />
          <path d="M12 16V8" />
          <path d="M17 16v-7" />
        </IconBase>
      );
    case "check":
      return (
        <IconBase className={className}>
          <path d="m5 13 4 4L19 7" />
        </IconBase>
      );
    case "clock":
      return (
        <IconBase className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </IconBase>
      );
    case "cloud":
      return (
        <IconBase className={className}>
          <path d="M20 16.6A4.5 4.5 0 0 0 17 8a6 6 0 0 0-11.5 2A4 4 0 0 0 6 18h14" />
        </IconBase>
      );
    case "edit":
      return (
        <IconBase className={className}>
          <path d="M12 20h9" />
          <path d="m16.5 3.5 4 4L8 20l-5 1 1-5L16.5 3.5Z" />
        </IconBase>
      );
    case "home":
      return (
        <IconBase className={className}>
          <path d="M3 11 12 3l9 8" />
          <path d="M5 10v10h14V10" />
        </IconBase>
      );
    case "link":
      return (
        <IconBase className={className}>
          <path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 1 1 7 7L17 13" />
          <path d="M14 11a5 5 0 0 1 0 7l-1.5 1.5a5 5 0 1 1-7-7L7 11" />
        </IconBase>
      );
    case "network":
      return (
        <IconBase className={className}>
          <path d="M2 8a15 15 0 0 1 20 0" />
          <path d="M5 12a10 10 0 0 1 14 0" />
          <path d="M8 16a5 5 0 0 1 8 0" />
          <circle cx="12" cy="20" r="1" />
        </IconBase>
      );
    case "play":
      return (
        <IconBase className={className}>
          <path d="m8 5 11 7-11 7V5Z" />
        </IconBase>
      );
    case "profile":
      return (
        <IconBase className={className}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20a8 8 0 0 1 16 0" />
        </IconBase>
      );
    case "save":
      return (
        <IconBase className={className}>
          <path d="M5 4h11l3 3v13H5z" />
          <path d="M9 4v6h6V4" />
          <path d="M9 20v-6h6v6" />
        </IconBase>
      );
    case "settings":
      return (
        <IconBase className={className}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2H9a1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.1a1 1 0 0 0 .6.9h.3a1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1v.3a1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.9.6z" />
        </IconBase>
      );
    case "share":
      return (
        <IconBase className={className}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.7 10.7 6.6-3.4" />
          <path d="m8.7 13.3 6.6 3.4" />
        </IconBase>
      );
    case "spark":
      return (
        <IconBase className={className}>
          <path d="M12 3 14 8l5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
        </IconBase>
      );
    case "trash":
      return (
        <IconBase className={className}>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="m6 6 1 14h10l1-14" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </IconBase>
      );
    case "warning":
      return (
        <IconBase className={className}>
          <path d="M12 3 2 21h20L12 3Z" />
          <path d="M12 9v5" />
          <path d="M12 17h.01" />
        </IconBase>
      );
    default:
      return null;
  }
}

function IconLabel({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span className="icon-label">
      <UiIcon name={icon} />
      <span>{children}</span>
    </span>
  );
}

function TopChrome() {
  const cloudSyncStatus = useAppStore((state) => state.cloudSyncStatus);
  const cloudAuthProvider = useAppStore((state) => state.cloudAuthProvider);
  const statusText =
    cloudSyncStatus === "ready"
      ? cloudAuthLabel(cloudAuthProvider)
      : cloudSyncStatus === "syncing"
        ? "동기화 중"
        : cloudSyncStatus === "error"
          ? "동기화 확인"
          : "로컬";

  return (
    <header className="chrome-top">
      <Link className="brand" to="/">
        <span className="brand-mark">
          <UiIcon name="spark" />
        </span>
        <span>
          <strong>{BRAND_NAME}</strong>
          <small>{BRAND_TAGLINE}</small>
        </span>
      </Link>
      <Link className="sync-pill" to="/settings">
        <UiIcon name="cloud" />
        <span>{statusText}</span>
      </Link>
    </header>
  );
}

function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      <NavLink className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`} to="/">
        <UiIcon name="home" />
        <span>홈</span>
      </NavLink>
      <NavLink className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`} to="/archive">
        <UiIcon name="archive" />
        <span>보관함</span>
      </NavLink>
      <NavLink className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`} to="/settings">
        <UiIcon name="settings" />
        <span>설정</span>
      </NavLink>
    </nav>
  );
}

function PageFrame({
  eyebrow,
  title,
  description,
  children,
  footer,
  className
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <main className={["page", className].filter(Boolean).join(" ")}>
      {title ? (
        <header className="page-head">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </header>
      ) : null}
      <div className="page-body">{children}</div>
      {footer ? <footer className="page-footer">{footer}</footer> : null}
    </main>
  );
}

function AppRouter() {
  const location = useLocation();
  const initializeCloud = useAppStore((state) => state.initializeCloud);
  const networkStatus = useAppStore((state) => state.networkStatus);
  const setNetworkStatus = useAppStore((state) => state.setNetworkStatus);
  const lastError = useAppStore((state) => state.lastError);
  const clearError = useAppStore((state) => state.clearError);
  const hideChrome = location.pathname.startsWith("/session/") || location.pathname.startsWith("/loading/");

  useEffect(() => {
    void initializeCloud();
  }, [initializeCloud]);

  useEffect(() => {
    const onOnline = () => setNetworkStatus("online");
    const onOffline = () => setNetworkStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setNetworkStatus]);

  useEffect(() => {
    if (!lastError) {
      return undefined;
    }
    const timeout = window.setTimeout(() => clearError(), 3200);
    return () => window.clearTimeout(timeout);
  }, [clearError, lastError]);

  return (
    <div className={["app-shell", hideChrome ? "immersive" : ""].filter(Boolean).join(" ")}>
      {hideChrome ? null : <TopChrome />}
      <div className="alert-stack" aria-live="polite">
        {networkStatus === "offline" ? (
          <div className="global-alert warning">
            <IconLabel icon="warning">오프라인 상태입니다. 상담 내용은 로컬에 저장됩니다.</IconLabel>
          </div>
        ) : null}
        {lastError ? (
          <div className="global-alert error">
            <IconLabel icon="warning">{lastError}</IconLabel>
          </div>
        ) : null}
      </div>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/notice" element={<NoticePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/topics" element={<TopicPage />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
        <Route path="/review/:sessionId" element={<ReviewPage />} />
        <Route path="/loading/:sessionId" element={<LoadingPage />} />
        <Route path="/result/:resultId" element={<ResultPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/shared/:token" element={<SharedPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/ops" element={<OpsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {hideChrome ? null : <BottomNav />}
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const profile = useAppStore((state) => state.profile);
  const sessions = useAppStore((state) => state.sessions);
  const results = useAppStore((state) => state.results);
  const activeSession = useMemo(() => latestOpenSession(sessions), [sessions]);
  const savedEntry = useMemo(() => latestSavedResult(results, sessions), [results, sessions]);
  const canStart = hasSajuProfile(profile);
  const start = () => {
    if (canStart) {
      navigate("/topics");
      return;
    }
    navigate("/profile", { state: { next: "/topics" } });
  };

  return (
    <PageFrame className="home-page minimal-home">
      <section className="brand-hero">
        <span className="brand-word">{BRAND_NAME}</span>
        <h1>내 사주로 보는 지금의 한 줄.</h1>
        <p>생년월일을 먼저 넣고, 사랑·일·마음 중 하나만 고르면 됩니다.</p>
        <button className="hero-start" onClick={start} type="button">
          <span>{canStart ? "시작하기" : "사주정보 입력"}</span>
          <UiIcon name="arrowRight" />
        </button>
        <div className="hero-tags" aria-label="상담 입구">
          <span>생년월일 필수</span>
          <span>사랑</span>
          <span>일</span>
          <span>마음</span>
        </div>
      </section>

      {activeSession ? (
        <button className="quiet-card" onClick={() => navigate(sessionPath(activeSession))} type="button">
          <div>
            <strong>이어서 보기</strong>
            <p>{topicById(activeSession.topicId).label} · {activeSession.responses.length}개 답변 완료</p>
          </div>
          <UiIcon name="arrowRight" />
        </button>
      ) : null}

      {savedEntry ? (
        <Link className="quiet-card" to={resultPath(savedEntry.result.id)}>
          <div>
            <strong>최근 결과</strong>
            <p>{savedEntry.result.summary}</p>
          </div>
          <UiIcon name="arrowRight" />
        </Link>
      ) : null}
    </PageFrame>
  );
}

function NoticePage() {
  const navigate = useNavigate();
  const setAcceptedNotice = useAppStore((state) => state.setAcceptedNotice);

  return (
    <PageFrame
      eyebrow="시작 전 안내"
      title="결과는 단정이 아니라 선택 기준으로 제공합니다."
      description="불안을 키우는 예언형 문장보다 현재 흐름, 반복 패턴, 다음 행동을 정리하는 데 초점을 둡니다."
      footer={
        <div className="footer-actions">
          <button
            className="button primary"
            onClick={() => {
              setAcceptedNotice(true);
              navigate("/topics");
            }}
            type="button"
          >
            <IconLabel icon="check">확인하고 시작</IconLabel>
          </button>
          <Link className="button ghost" to="/">
            홈으로
          </Link>
        </div>
      }
    >
      <div className="notice-grid">
        <article className="info-card">
          <UiIcon name="spark" />
          <h2>흐름 중심</h2>
          <p>좋다, 나쁘다보다 지금 어느 기준을 먼저 세워야 하는지 보여줍니다.</p>
        </article>
        <article className="info-card">
          <UiIcon name="clock" />
          <h2>출생시간 안내</h2>
          <p>출생시간을 모르면 큰 흐름 중심으로 제공하고, 결과 상단에 정확도 안내를 표시합니다.</p>
        </article>
        <article className="info-card">
          <UiIcon name="warning" />
          <h2>현실 판단 병행</h2>
          <p>의료, 법률, 재정 판단은 반드시 현실 자료와 전문가 의견을 함께 확인해야 합니다.</p>
        </article>
      </div>
    </PageFrame>
  );
}

function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const savedProfile = useAppStore((state) => state.profile);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const [form, setForm] = useState<UserProfile>(savedProfile);
  const [formError, setFormError] = useState<string | null>(null);
  const nextPath = (location.state as { next?: string } | null)?.next ?? "/topics";

  useEffect(() => {
    setForm(savedProfile);
  }, [savedProfile]);

  const submit = () => {
    if (!form.birthDate.trim()) {
      setFormError("생년월일은 사주 계산의 기준이라 반드시 필요합니다.");
      return;
    }
    if (!form.birthTimeUnknown && !form.birthTime.trim()) {
      setFormError("출생시간을 입력하거나 '출생시간을 몰라요'를 선택해 주세요.");
      return;
    }

    const normalized: UserProfile = {
      ...form,
      nickname: form.nickname.trim(),
      birthTime: form.birthDate && !form.birthTimeUnknown ? form.birthTime : "",
      birthTimeUnknown: !form.birthDate || form.birthTimeUnknown || !form.birthTime
    };
    updateProfile(normalized);
    navigate(nextPath);
  };

  return (
    <PageFrame
      eyebrow="사주정보"
      title="먼저 본인의 사주정보가 필요합니다."
      description="생년월일은 필수입니다. 출생시간을 모르면 모름 상태로 진행할 수 있지만 결과는 큰 흐름 중심으로 나옵니다."
      footer={
        <div className="footer-actions">
          <button className="button primary" onClick={submit} type="button">
            <IconLabel icon="save">사주정보 저장</IconLabel>
          </button>
          <Link className="button ghost" to="/">
            홈으로
          </Link>
        </div>
      }
    >
      <section className="profile-summary-card">
        <span className="profile-avatar">
          <UiIcon name="profile" />
        </span>
        <div>
          <p className="eyebrow">입력 상태</p>
          <h2>{form.nickname.trim() || "이름 미입력"}</h2>
          <p>{formatProfileSummary(form)}</p>
        </div>
      </section>

      {formError ? (
        <div className="form-error">
          <IconLabel icon="warning">{formError}</IconLabel>
        </div>
      ) : null}

      <div className="form-grid">
        <label className="field">
          <span>닉네임</span>
          <input
            value={form.nickname}
            onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))}
            placeholder="이름 또는 별명"
          />
        </label>
        <label className="field">
          <span>생년월일</span>
          <input
            value={form.birthDate}
            onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
            type="date"
          />
        </label>
        <div className="field">
          <span>달력 기준</span>
          <div className="segmented">
            {(["solar", "lunar"] as const).map((calendar) => (
              <button
                key={calendar}
                className={form.birthCalendar === calendar ? "active" : ""}
                onClick={() => setForm((current) => ({ ...current, birthCalendar: calendar }))}
                type="button"
              >
                {calendarLabel(calendar)}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>출생시간</span>
          <input
            disabled={form.birthTimeUnknown}
            value={form.birthTime}
            onChange={(event) => setForm((current) => ({ ...current, birthTime: event.target.value }))}
            type="time"
          />
        </label>
        <label className="check-row">
          <input
            checked={form.birthTimeUnknown}
            onChange={(event) =>
              setForm((current) => ({ ...current, birthTimeUnknown: event.target.checked }))
            }
            type="checkbox"
          />
          <span>출생시간을 몰라요</span>
        </label>
        <div className="field">
          <span>성별</span>
          <div className="segmented three">
            {(["female", "male", "other"] as const).map((gender) => (
              <button
                key={gender}
                className={form.gender === gender ? "active" : ""}
                onClick={() => setForm((current) => ({ ...current, gender }))}
                type="button"
              >
                {genderLabel(gender)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

function TopicPage() {
  const navigate = useNavigate();
  const profile = useAppStore((state) => state.profile);
  const setConsultMode = useAppStore((state) => state.setConsultMode);
  const sessions = useAppStore((state) => state.sessions);
  const startSession = useAppStore((state) => state.startSession);
  const openSessions = useMemo(() => latestOpenSession(sessions), [sessions]);

  const launch = (topicId: TopicId, forceRestart = false) => {
    if (!hasSajuProfile(profile)) {
      navigate("/profile", { state: { next: "/topics" } });
      return;
    }

    try {
      setConsultMode("quick");
      const session = startSession(topicId, forceRestart, "quick");
      if (session) {
        navigate(sessionPath(session));
      }
    } catch {
      useAppStore.setState({ lastError: "상담 시작 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." });
    }
  };

  if (!hasSajuProfile(profile)) {
    return (
      <PageFrame
        className="start-page"
        eyebrow={BRAND_NAME}
        title="사주정보부터 입력해 주세요."
        description="하루결은 입력한 생년월일과 출생시간을 기준으로 결과를 만듭니다."
        footer={
          <button
            className="button primary"
            onClick={() => navigate("/profile", { state: { next: "/topics" } })}
            type="button"
          >
            사주정보 입력
          </button>
        }
      >
        <section className="saju-required-card">
          <UiIcon name="profile" />
          <div>
            <strong>필수 정보</strong>
            <p>생년월일, 양력/음력, 출생시간 또는 출생시간 모름</p>
          </div>
        </section>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      className="start-page"
      eyebrow={BRAND_NAME}
      title="이제 하나만 고르면 됩니다."
      description="입력한 사주정보를 기준으로 사랑, 일, 마음 흐름을 정리합니다."
      footer={
        openSessions ? (
          <button className="button ghost" onClick={() => navigate(sessionPath(openSessions))} type="button">
            이어서 보기
          </button>
        ) : null
      }
    >
      <section className="entry-grid" aria-label="상담 시작 선택">
        {ENTRY_POINTS.map((entry) => {
          const topic = topicById(entry.topicId);
          return (
            <button
              key={entry.id}
              className="entry-card"
              onClick={() => launch(entry.topicId, false)}
              style={topicStyle(topic)}
              type="button"
            >
              <span className="topic-mark" />
              <strong>{entry.label}</strong>
              <p>{entry.line}</p>
              <UiIcon name="arrowRight" />
            </button>
          );
        })}
      </section>

      <p className="start-note">{formatProfileSummary(profile)} 기준으로 봅니다.</p>
    </PageFrame>
  );
}

function SessionPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const sessions = useAppStore((state) => state.sessions);
  const submitAnswer = useAppStore((state) => state.submitAnswer);
  const goBack = useAppStore((state) => state.goBack);
  const startSession = useAppStore((state) => state.startSession);
  const session = sessions.find((entry) => entry.id === sessionId);

  if (!session) {
    return <Navigate to="/topics" replace />;
  }
  if (session.status === "review") {
    return <Navigate to={`/review/${session.id}`} replace />;
  }
  if (session.status === "loading") {
    return <Navigate to={`/loading/${session.id}`} replace />;
  }
  if (session.status === "result" && session.resultId) {
    return <Navigate to={resultPath(session.resultId)} replace />;
  }

  if (session.status === "outdated") {
    return (
      <main className="session-shell">
        <section className="state-screen">
          <UiIcon name="warning" />
          <h1>질문 구조가 변경되었습니다.</h1>
          <p>기존 응답은 보호하고, 최신 질문 기준으로 새 상담을 시작할 수 있습니다.</p>
          <button
            className="button primary"
            onClick={() => {
              const next = startSession(session.topicId, true, session.consultMode);
              if (next) {
                navigate(sessionPath(next), { replace: true });
              }
            }}
            type="button"
          >
            다시 시작
          </button>
        </section>
      </main>
    );
  }

  const flow = FLOW_MAP[session.topicId];
  const node = getNode(flow, session.currentNodeId);
  const topic = topicById(session.topicId);
  const progress = getProgressPercent(session);

  if (!node) {
    return <Navigate to={`/review/${session.id}`} replace />;
  }

  return (
    <main className="session-shell">
      <header className="session-top">
        <button className="icon-button" onClick={() => navigate("/topics")} type="button" aria-label="주제 선택으로 이동">
          <UiIcon name="arrowLeft" />
        </button>
        <div>
          <p>{topic.label} · {modeLabel(session.consultMode)}</p>
          <strong>{session.responses.length + 1}번째 질문</strong>
        </div>
        <button
          className="icon-button"
          disabled={session.responses.length === 0}
          onClick={() => goBack(session.id)}
          type="button"
          aria-label="이전 질문"
        >
          <UiIcon name="edit" />
        </button>
      </header>

      <div className="progress-track" aria-label={`진행률 ${progress}%`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <section className="question-card" style={topicStyle(topic)}>
        <span className="topic-mark" />
        <p className="eyebrow">답변을 고르면 다음 질문으로 이어집니다.</p>
        <h1>{node.prompt}</h1>
        {node.helper ? <p>{node.helper}</p> : null}
      </section>

      <section className="choice-list" aria-label="답변 선택">
        {node.options.map((option, index) => (
          <button
            key={option.id}
            className="choice-card"
            onClick={() => {
              const updated = submitAnswer(session.id, node.id, option.id);
              if (updated?.status === "review") {
                navigate(`/review/${session.id}`);
              }
            }}
            type="button"
          >
            <span className="choice-index">{index + 1}</span>
            <span>
              <strong>{option.label}</strong>
              {option.description ? <small>{option.description}</small> : null}
            </span>
            <UiIcon name="arrowRight" />
          </button>
        ))}
      </section>

      <footer className="session-footer">
        <button className="button ghost" onClick={() => navigate("/topics")} type="button">
          나가기
        </button>
        <button
          className="button secondary"
          disabled={session.responses.length === 0}
          onClick={() => navigate(`/review/${session.id}`)}
          type="button"
        >
          답변 검토
        </button>
      </footer>
    </main>
  );
}

function ReviewPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const sessions = useAppStore((state) => state.sessions);
  const rewindToNode = useAppStore((state) => state.rewindToNode);
  const markLoading = useAppStore((state) => state.markLoading);
  const session = sessions.find((entry) => entry.id === sessionId);

  if (!session) {
    return <Navigate to="/topics" replace />;
  }
  if (session.status === "result" && session.resultId) {
    return <Navigate to={resultPath(session.resultId)} replace />;
  }

  const flow = FLOW_MAP[session.topicId];
  const topic = topicById(session.topicId);

  return (
    <PageFrame
      eyebrow="답변 검토"
      title="결과를 만들기 전에 흐름을 한 번 확인하세요."
      description={`${topic.label} · ${modeLabel(session.consultMode)} · ${session.responses.length}개 답변`}
      footer={
        <div className="footer-actions">
          <button
            className="button primary"
            onClick={() => {
              markLoading(session.id);
              navigate(`/loading/${session.id}`);
            }}
            type="button"
          >
            <IconLabel icon="play">결과 보기</IconLabel>
          </button>
          <Link className="button ghost" to={`/session/${session.id}`}>
            질문으로
          </Link>
        </div>
      }
    >
      <section className="profile-nudge">
        <div>
          <p className="eyebrow">기본 정보</p>
          <p>{formatProfileSummary(session.profileSnapshot)}</p>
        </div>
        <span className="state-pill">{session.profileSnapshot.birthTimeUnknown ? "큰 흐름 중심" : "출생시간 반영"}</span>
      </section>

      <div className="review-list">
        {session.responses.length === 0 ? (
          <article className="empty-state">
            <h2>아직 답변이 없습니다.</h2>
            <p>질문 화면으로 돌아가 첫 답변부터 시작해 주세요.</p>
          </article>
        ) : (
          session.responses.map((response, index) => {
            const node = getNode(flow, response.nodeId);
            return (
              <article key={`${response.nodeId}-${index}`} className="review-row">
                <span className="step-number">{index + 1}</span>
                <div>
                  <p>{node?.prompt ?? "질문 정보 없음"}</p>
                  <strong>{response.label}</strong>
                </div>
                <button
                  className="button ghost small"
                  onClick={() => {
                    rewindToNode(session.id, response.nodeId);
                    navigate(`/session/${session.id}`);
                  }}
                  type="button"
                >
                  수정
                </button>
              </article>
            );
          })
        )}
      </div>
    </PageFrame>
  );
}

function LoadingPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const sessions = useAppStore((state) => state.sessions);
  const generateResult = useAppStore((state) => state.generateResult);
  const markLoading = useAppStore((state) => state.markLoading);
  const [started, setStarted] = useState(false);
  const session = sessions.find((entry) => entry.id === sessionId);

  useEffect(() => {
    if (!session || started) {
      return undefined;
    }

    setStarted(true);
    if (session.status !== "loading") {
      markLoading(session.id);
    }

    const timer = window.setTimeout(() => {
      const result = generateResult(session.id);
      if (result) {
        navigate(resultPath(result.id), { replace: true });
      }
    }, 950);

    return () => window.clearTimeout(timer);
  }, [generateResult, markLoading, navigate, session, started]);

  if (!session) {
    return <Navigate to="/topics" replace />;
  }

  return (
    <main className="loading-shell">
      <section className="loading-card">
        <div className="loading-spinner" aria-hidden="true" />
        <p className="eyebrow">결과 생성</p>
        <h1>답변 흐름을 정리하고 있습니다.</h1>
        <ul>
          <li>
            <UiIcon name="check" />
            질문 태그 분석
          </li>
          <li>
            <UiIcon name="check" />
            흐름 기준 보정
          </li>
          <li>
            <UiIcon name="check" />
            행동 가이드 구성
          </li>
        </ul>
      </section>
    </main>
  );
}

function ResultPage() {
  const { resultId } = useParams();
  const results = useAppStore((state) => state.results);
  const sessions = useAppStore((state) => state.sessions);
  const saveSession = useAppStore((state) => state.saveSession);
  const createShare = useAppStore((state) => state.createShare);
  const result = results.find((entry) => entry.id === resultId);
  const session = sessions.find((entry) => entry.resultId === resultId);
  const [copied, setCopied] = useState<string | null>(null);

  if (!result || !session) {
    return <Navigate to="/archive" replace />;
  }

  return (
    <ResultView
      result={result}
      session={session}
      copied={copied}
      onSave={() => saveSession(session.id)}
      onShare={async () => {
        const share = createShare(session.id);
        if (!share) {
          return;
        }
        const url = absoluteShareUrl(share.urlPath);
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url).catch(() => undefined);
        }
        setCopied(url);
      }}
    />
  );
}

function ResultView({
  result,
  session,
  copied,
  onSave,
  onShare,
  readOnly = false
}: {
  result: ConsultationResult;
  session?: ConsultationSession;
  copied?: string | null;
  onSave?: () => void;
  onShare?: () => void | Promise<void>;
  readOnly?: boolean;
}) {
  const topic = topicById(result.topicId);
  const activeShare = session?.shareToken
    ? useAppStore.getState().shares.find((share) => share.token === session.shareToken)
    : undefined;
  const doLead = cardLead(cardByKey(result, "do"));
  const dontLead = cardLead(cardByKey(result, "dont"));
  const nextQuestions = result.recommendedQuestions.length
    ? result.recommendedQuestions
    : splitLines(cardByKey(result, "followUp")?.body ?? "");

  return (
    <PageFrame
      className="result-page"
      eyebrow={`${topic.label} 결과`}
      title={result.summary}
      description="먼저 핵심만 확인하고, 필요할 때 상세 카드를 펼쳐보세요."
      footer={
        readOnly ? (
          <Link className="button primary" to="/">
            내 상담 시작
          </Link>
        ) : (
          <div className="footer-actions three">
            <button className="button primary" onClick={onSave} type="button">
              <IconLabel icon="save">{session?.saved ? "저장됨" : "저장"}</IconLabel>
            </button>
            <button className="button secondary" onClick={() => void onShare?.()} type="button">
              <IconLabel icon="share">공유</IconLabel>
            </button>
            <Link className="button ghost" to="/topics">
              다른 주제
            </Link>
          </div>
        )
      }
    >
      <section className="result-hero" style={topicStyle(topic)}>
        <div className="badge-row">
          <span>{topic.label}</span>
          {session ? <span>{modeLabel(session.consultMode)}</span> : null}
          <span>{sourceLabel(result.generationSource)}</span>
          {session?.saved ? <span>저장됨</span> : null}
        </div>
        <h2>{cardLead(cardByKey(result, "summary")) || result.summary}</h2>
        <div className="result-meta">
          <span>
            <UiIcon name="clock" />
            {formatDateTime(result.generatedAt)}
          </span>
          {session ? (
            <span>
              <UiIcon name="chart" />
              답변 {session.responses.length}개
            </span>
          ) : null}
        </div>
        {result.accuracyNote ? <p className="accuracy-note">{result.accuracyNote}</p> : null}
      </section>

      {copied ? (
        <section className="copy-card">
          <p className="eyebrow">공유 링크가 준비되었습니다.</p>
          <p>{copied}</p>
        </section>
      ) : null}

      {activeShare && !isShareExpired(activeShare) ? <ShareInfo share={activeShare} /> : null}

      <section className="action-summary">
        <article>
          <p className="eyebrow">지금 할 일</p>
          <h3>{doLead}</h3>
        </article>
        <article>
          <p className="eyebrow">피할 패턴</p>
          <h3>{dontLead}</h3>
        </article>
        <article>
          <p className="eyebrow">이어 볼 질문</p>
          <ul>
            {nextQuestions.slice(0, 3).map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </article>
      </section>

      <ResultCardList result={result} />
      {session ? <ResponseTrail session={session} /> : null}
    </PageFrame>
  );
}

function ShareInfo({ share }: { share: ShareRecord }) {
  return (
    <section className="copy-card">
      <p className="eyebrow">활성 공유 링크</p>
      <p>{absoluteShareUrl(share.urlPath)}</p>
      <small>만료일 {formatDate(share.expiresAt)}</small>
    </section>
  );
}

function ResultCardList({ result }: { result: ConsultationResult }) {
  return (
    <section className="section-stack">
      <div className="section-head">
        <div>
          <p className="eyebrow">상세 리포트</p>
          <h2>필요한 카드만 펼쳐보세요.</h2>
        </div>
      </div>
      <div className="result-card-list">
        {result.cards.map((card, index) => (
          <details key={card.key} className="result-detail-card" open={index < 2}>
            <summary>
              <span className="step-number">{index + 1}</span>
              <span>
                <strong>{card.title}</strong>
                <small>{RESULT_CARD_DESCRIPTIONS[card.key]}</small>
              </span>
              <UiIcon name="arrowRight" />
            </summary>
            <div className="detail-sections">
              {parseCardSections(card).map((section) => (
                <article key={`${card.key}-${section.title}`}>
                  <h3>{section.title}</h3>
                  <p>{section.body}</p>
                </article>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function ResponseTrail({ session }: { session: ConsultationSession }) {
  if (session.responses.length === 0) {
    return null;
  }

  const flow = FLOW_MAP[session.topicId];

  return (
    <section className="section-stack">
      <div className="section-head">
        <div>
          <p className="eyebrow">답변 흐름</p>
          <h2>결과에 반영된 선택</h2>
        </div>
      </div>
      <div className="response-trail">
        {session.responses.map((response, index) => {
          const node = getNode(flow, response.nodeId);
          return (
            <article key={`${response.nodeId}-${index}`}>
              <span className="step-number">{index + 1}</span>
              <div>
                <p>{node?.prompt ?? "질문 정보 없음"}</p>
                <strong>{response.label}</strong>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ArchivePage() {
  const results = useAppStore((state) => state.results);
  const sessions = useAppStore((state) => state.sessions);
  const savedEntries = useMemo(
    () =>
      [...results]
        .map((result) => ({
          result,
          session: sessions.find((session) => session.resultId === result.id)
        }))
        .filter((entry) => Boolean(entry.session?.saved))
        .sort((a, b) => b.result.generatedAt.localeCompare(a.result.generatedAt)),
    [results, sessions]
  );

  return (
    <PageFrame
      eyebrow="보관함"
      title="저장한 결과를 다시 확인하세요."
      description="최근 저장 결과부터 정리했습니다."
      footer={
        <Link className="button primary" to="/topics">
          새 상담 시작
        </Link>
      }
    >
      {savedEntries.length === 0 ? (
        <article className="empty-state">
          <h2>아직 저장한 결과가 없습니다.</h2>
          <p>결과 화면에서 저장하면 이곳에서 다시 볼 수 있습니다.</p>
        </article>
      ) : (
        <div className="archive-list">
          {savedEntries.map(({ result, session }) => (
            <Link key={result.id} className="archive-card" to={resultPath(result.id)}>
              <div>
                <p className="eyebrow">{topicById(result.topicId).label}</p>
                <h2>{result.summary}</h2>
                <p>{formatDateTime(result.generatedAt)} · {session ? modeLabel(session.consultMode) : "상담 결과"}</p>
              </div>
              <UiIcon name="arrowRight" />
            </Link>
          ))}
        </div>
      )}
    </PageFrame>
  );
}

function SharedPage() {
  const { token } = useParams();
  const shares = useAppStore((state) => state.shares);
  const results = useAppStore((state) => state.results);
  const sessions = useAppStore((state) => state.sessions);
  const share = shares.find((entry) => entry.token === token);
  const result = share ? results.find((entry) => entry.id === share.resultId) : undefined;
  const session = result ? sessions.find((entry) => entry.resultId === result.id) : undefined;

  if (!share || !result || isShareExpired(share)) {
    return (
      <PageFrame
        eyebrow="공유 결과"
        title="링크가 만료되었거나 비활성화되었습니다."
        description="유효한 링크가 아니면 결과를 노출하지 않습니다."
        footer={
          <Link className="button primary" to="/">
            홈으로 이동
          </Link>
        }
      >
        <article className="empty-state warning">
          <UiIcon name="warning" />
          <h2>공유 링크 상태를 확인해 주세요.</h2>
        </article>
      </PageFrame>
    );
  }

  return <ResultView result={result} session={session} readOnly />;
}

function SettingsPage() {
  const networkStatus = useAppStore((state) => state.networkStatus);
  const cloudSyncStatus = useAppStore((state) => state.cloudSyncStatus);
  const cloudUserId = useAppStore((state) => state.cloudUserId);
  const cloudUserEmail = useAppStore((state) => state.cloudUserEmail);
  const cloudAuthProvider = useAppStore((state) => state.cloudAuthProvider);
  const signInEmail = useAppStore((state) => state.signInEmail);
  const signInKakao = useAppStore((state) => state.signInKakao);
  const signOutCloud = useAppStore((state) => state.signOutCloud);
  const syncCloudState = useAppStore((state) => state.syncCloudState);
  const sessions = useAppStore((state) => state.sessions);
  const results = useAppStore((state) => state.results);
  const shares = useAppStore((state) => state.shares);
  const disableShare = useAppStore((state) => state.disableShare);
  const deleteAllData = useAppStore((state) => state.deleteAllData);
  const [email, setEmail] = useState("");
  const cloudStateLabel =
    cloudSyncStatus === "ready"
      ? "동기화 준비됨"
      : cloudSyncStatus === "syncing"
        ? "동기화 중"
        : cloudSyncStatus === "error"
          ? "동기화 오류"
          : "로컬 전용";
  const cloudAccountText = cloudUserId
    ? `${cloudAuthLabel(cloudAuthProvider)} 계정${cloudUserEmail ? ` · ${cloudUserEmail}` : ""}`
    : "로그인 전 상태입니다.";

  return (
    <PageFrame
      eyebrow="설정"
      title="계정과 데이터를 관리하세요."
      description="동기화, 공유 링크, 로컬 데이터 삭제를 한곳에서 처리합니다."
    >
      <section className="settings-grid">
        <article className="setting-card">
          <UiIcon name="cloud" />
          <p className="eyebrow">Supabase</p>
          <h2>{isSupabaseConfigured ? cloudStateLabel : "환경 변수 미설정"}</h2>
          <p>{cloudAccountText}</p>
          {isSupabaseConfigured ? (
            <div className="inline-actions">
              <button className="button secondary small" onClick={() => void syncCloudState()} type="button">
                지금 동기화
              </button>
              {cloudUserId ? (
                <button className="button ghost small" onClick={() => void signOutCloud()} type="button">
                  로그아웃
                </button>
              ) : null}
            </div>
          ) : null}
        </article>
        <article className="setting-card">
          <UiIcon name="network" />
          <p className="eyebrow">네트워크</p>
          <h2>{networkStatus === "online" ? "온라인" : "오프라인"}</h2>
          <p>오프라인에서도 로컬 상담은 계속 진행됩니다.</p>
        </article>
      </section>

      {isSupabaseConfigured && (!cloudUserId || cloudAuthProvider !== "kakao") ? (
        <section className="form-card">
          <h2>로그인 전환</h2>
          <button className="button kakao" onClick={() => void signInKakao()} type="button">
            카카오로 연결
          </button>
          <label className="field">
            <span>이메일 로그인 링크</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              type="email"
            />
          </label>
          <button
            className="button secondary"
            onClick={async () => {
              if (!email.trim()) {
                return;
              }
              const ok = await signInEmail(email.trim());
              if (ok) {
                setEmail("");
              }
            }}
            type="button"
          >
            로그인 링크 전송
          </button>
        </section>
      ) : null}

      <section className="data-grid">
        <article>
          <strong>{sessions.length}</strong>
          <span>세션</span>
        </article>
        <article>
          <strong>{results.length}</strong>
          <span>결과</span>
        </article>
        <article>
          <strong>{shares.length}</strong>
          <span>공유 링크</span>
        </article>
      </section>

      <section className="section-stack">
        <div className="section-head">
          <div>
            <p className="eyebrow">공유 링크</p>
            <h2>활성 링크 관리</h2>
          </div>
        </div>
        {shares.length === 0 ? (
          <article className="empty-state">
            <p>생성된 공유 링크가 없습니다.</p>
          </article>
        ) : (
          <div className="share-list">
            {shares.map((share) => (
              <article key={share.token} className="share-row">
                <div>
                  <strong>{absoluteShareUrl(share.urlPath)}</strong>
                  <p>상태 {share.status} · 만료 {formatDate(share.expiresAt)}</p>
                </div>
                {share.status === "active" ? (
                  <button className="button ghost small" onClick={() => disableShare(share.token)} type="button">
                    비활성화
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="danger-zone">
        <div>
          <p className="eyebrow">데이터 삭제</p>
          <h2>로컬 데이터를 모두 삭제합니다.</h2>
          <p>프로필, 세션, 결과, 공유 링크가 현재 기기에서 삭제됩니다.</p>
        </div>
        <button
          className="button danger"
          onClick={() => {
            if (window.confirm("저장된 데이터를 모두 삭제할까요?")) {
              deleteAllData();
            }
          }}
          type="button"
        >
          <IconLabel icon="trash">전체 삭제</IconLabel>
        </button>
      </section>
    </PageFrame>
  );
}

function OpsPage() {
  const sessions = useAppStore((state) => state.sessions);
  const topicMetrics = useMemo(() => computeTopicMetrics(sessions), [sessions]);
  const questionMetrics = useMemo(() => computeQuestionMetrics(sessions), [sessions]);
  const totalNodes = Object.values(FLOW_MAP).reduce((sum, flow) => sum + flow.nodes.length, 0);
  const dropoutCandidates = questionMetrics
    .filter((metric) => metric.pendingDropouts > 0)
    .sort((a, b) => b.dropoutRate - a.dropoutRate)
    .slice(0, 8);

  return (
    <PageFrame
      eyebrow="운영 지표"
      title="질문과 결과 구조를 점검합니다."
      description="사용자 화면에서는 숨겨도 되는 내부 확인용 페이지입니다."
    >
      <section className="data-grid">
        <article>
          <strong>{TOPICS.length}</strong>
          <span>주제</span>
        </article>
        <article>
          <strong>{totalNodes}</strong>
          <span>질문 노드</span>
        </article>
        <article>
          <strong>{SIGNAL_TEMPLATES.length}</strong>
          <span>신호 템플릿</span>
        </article>
      </section>
      <section className="ops-table">
        <h2>주제별 통계</h2>
        {topicMetrics.map((metric) => (
          <div key={metric.topicId}>
            <strong>{metric.label}</strong>
            <span>진입 {metric.entries}</span>
            <span>완주율 {metric.completionRate}%</span>
            <span>저장률 {metric.saveRate}%</span>
          </div>
        ))}
      </section>
      <section className="ops-table">
        <h2>질문 이탈 후보</h2>
        {dropoutCandidates.length === 0 ? (
          <p>이탈 후보 데이터가 아직 없습니다.</p>
        ) : (
          dropoutCandidates.map((metric) => (
            <div key={metric.nodeId}>
              <strong>{metric.prompt}</strong>
              <span>{topicById(metric.topicId as TopicId).label}</span>
              <span>이탈률 {metric.dropoutRate}%</span>
            </div>
          ))
        )}
      </section>
    </PageFrame>
  );
}

function NotFoundPage() {
  return (
    <PageFrame
      eyebrow="404"
      title="요청한 화면을 찾을 수 없습니다."
      description="경로가 잘못되었거나 만료된 링크일 수 있습니다."
      footer={
        <Link className="button primary" to="/">
          홈으로 이동
        </Link>
      }
    >
      <article className="empty-state warning">
        <UiIcon name="warning" />
        <h2>링크 상태를 확인해 주세요.</h2>
      </article>
    </PageFrame>
  );
}
