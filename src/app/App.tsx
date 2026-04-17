import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom";

import { SIGNAL_TEMPLATES } from "../data/resultTemplates";
import { FLOW_MAP } from "../data/questionFlows";
import { TOPICS } from "../data/topics";
import { getNode, getProgressPercent } from "../lib/engine";
import { isFirebaseConfigured } from "../lib/firebase";
import { computeQuestionMetrics, computeTopicMetrics } from "../lib/ops";
import { isShareExpired } from "../lib/share";
import { useAppStore } from "../store/useAppStore";
import type {
  ConsultationResult,
  ConsultationSession,
  TopicDefinition,
  TopicId,
  UserProfile
} from "../types";

function isProfileComplete(profile: UserProfile) {
  return Boolean(profile.birthDate && (profile.birthTimeUnknown || profile.birthTime));
}

function topicById(topicId: TopicId) {
  return TOPICS.find((topic) => topic.id === topicId) as TopicDefinition;
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

function genderLabel(value: UserProfile["gender"]) {
  switch (value) {
    case "female":
      return "여성";
    case "male":
      return "남성";
    default:
      return "기타";
  }
}

function calendarLabel(value: UserProfile["birthCalendar"]) {
  return value === "solar" ? "양력" : "음력";
}

function formatProfileSummary(profile: UserProfile) {
  const parts: string[] = [];

  if (profile.nickname.trim()) {
    parts.push(profile.nickname.trim());
  }

  if (profile.birthDate) {
    parts.push(profile.birthDate + " " + calendarLabel(profile.birthCalendar));
    parts.push(profile.birthTimeUnknown ? "출생시간 모름" : profile.birthTime || "출생시간 미입력");
  }

  if (profile.gender !== "other") {
    parts.push(genderLabel(profile.gender));
  }

  return parts.length > 0
    ? parts.join(" · ")
    : "빠른 시작 모드입니다. 생년월일과 출생시간을 입력하면 결과가 더 세밀해집니다.";
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

function isReloadNavigation() {
  if (typeof performance === "undefined") {
    return false;
  }

  const navigationEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return navigationEntries[0]?.type === "reload";
}

type IconName =
  | "spark"
  | "archive"
  | "settings"
  | "arrowRight"
  | "play"
  | "notice"
  | "profile"
  | "back"
  | "edit"
  | "save"
  | "share"
  | "warning"
  | "network"
  | "cloud"
  | "clock"
  | "chart"
  | "trash"
  | "link"
  | "check";

function IconBase({ children, className }: { children: React.ReactNode; className?: string }) {
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
    case "spark":
      return (
        <IconBase className={className}>
          <path d="M12 3 14 8l5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
        </IconBase>
      );
    case "archive":
      return (
        <IconBase className={className}>
          <path d="M3 8h18v12H3z" />
          <path d="M1 4h22v4H1z" />
          <path d="M10 12h4" />
        </IconBase>
      );
    case "settings":
      return (
        <IconBase className={className}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2H9a1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.1a1 1 0 0 0 .6.9h.3a1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1v.3a1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.9.6z" />
        </IconBase>
      );
    case "arrowRight":
      return (
        <IconBase className={className}>
          <path d="m9 18 6-6-6-6" />
        </IconBase>
      );
    case "play":
      return (
        <IconBase className={className}>
          <path d="m8 5 11 7-11 7V5Z" />
        </IconBase>
      );
    case "notice":
      return (
        <IconBase className={className}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </IconBase>
      );
    case "profile":
      return (
        <IconBase className={className}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20a8 8 0 0 1 16 0" />
        </IconBase>
      );
    case "back":
      return (
        <IconBase className={className}>
          <path d="m15 18-6-6 6-6" />
        </IconBase>
      );
    case "edit":
      return (
        <IconBase className={className}>
          <path d="M12 20h9" />
          <path d="m16.5 3.5 4 4L8 20l-5 1 1-5L16.5 3.5Z" />
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
    case "warning":
      return (
        <IconBase className={className}>
          <path d="M12 3 2 21h20L12 3Z" />
          <path d="M12 9v5" />
          <path d="M12 17h.01" />
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
    case "cloud":
      return (
        <IconBase className={className}>
          <path d="M20 16.6A4.5 4.5 0 0 0 17 8a6 6 0 0 0-11.5 2A4 4 0 0 0 6 18h14" />
        </IconBase>
      );
    case "clock":
      return (
        <IconBase className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
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
    case "link":
      return (
        <IconBase className={className}>
          <path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 1 1 7 7L17 13" />
          <path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 1 1-7-7L7 11" />
        </IconBase>
      );
    case "check":
      return (
        <IconBase className={className}>
          <path d="m5 13 4 4L19 7" />
        </IconBase>
      );
    default:
      return null;
  }
}

function TopbarLink({ to, icon, label }: { to: string; icon: IconName; label: string }) {
  return (
    <Link className="topbar-link" to={to} title={label}>
      <UiIcon name={icon} />
      <span>{label}</span>
    </Link>
  );
}

function IconLabel({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <span className="icon-label">
      <UiIcon name={icon} />
      <span>{children}</span>
    </span>
  );
}

function ScreenFrame({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  className,
  footerClassName,
  hideNav = false,
  hideHeader = false
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  footerClassName?: string;
  hideNav?: boolean;
  hideHeader?: boolean;
}) {
  return (
    <main className={["screen", className].filter(Boolean).join(" ")}>
      <div className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">
            <UiIcon name="spark" />
          </span>
          <span className="brand-text">온결 사주</span>
        </Link>
        {hideNav ? null : (
          <div className="topbar-links">
            <TopbarLink to="/archive" icon="archive" label="보관함" />
            <TopbarLink to="/settings" icon="settings" label="설정" />
          </div>
        )}
      </div>
      {hideHeader ? null : (
        <header className="screen-header">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {subtitle ? <p className="subtitle">{subtitle}</p> : null}
        </header>
      )}
      <section className="screen-body">{children}</section>
      {footer ? (
        <footer className={["screen-footer", footerClassName].filter(Boolean).join(" ")}>
          {footer}
        </footer>
      ) : null}
    </main>
  );
}

function ResultCards({ result }: { result: ConsultationResult }) {
  return (
    <div className="result-cards">
      {result.cards.map((card, index) => (
        <article key={card.key} className="panel result-card">
          <header className="result-card-header">
            <span className="result-card-index">{index + 1}</span>
            <p className="result-card-title">{card.title.replace(/^\d+\.\s*/, "")}</p>
          </header>
          <div className="card-body whitespace">{card.body}</div>
        </article>
      ))}
    </div>
  );
}

function AppRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const networkStatus = useAppStore((state) => state.networkStatus);
  const setNetworkStatus = useAppStore((state) => state.setNetworkStatus);
  const lastError = useAppStore((state) => state.lastError);
  const clearError = useAppStore((state) => state.clearError);

  useEffect(() => {
    if (!isReloadNavigation() || location.pathname === "/") {
      return;
    }
    navigate("/", { replace: true });
  }, [location.pathname, navigate]);

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
    const timeout = window.setTimeout(() => clearError(), 2600);
    return () => window.clearTimeout(timeout);
  }, [lastError, clearError]);

  return (
    <div className="app-shell">
      {networkStatus === "offline" ? (
        <div className="global-alert warning">
          <IconLabel icon="warning">오프라인 상태입니다. 로컬 저장 기준으로 동작합니다.</IconLabel>
        </div>
      ) : null}
      {lastError ? (
        <div className="global-alert error">
          <IconLabel icon="warning">{lastError}</IconLabel>
        </div>
      ) : null}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/notice" element={<NoticePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/topics" element={<TopicHomePage />} />
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

function LandingPage() {
  const navigate = useNavigate();
  const sessions = useAppStore((state) => state.sessions);
  const startSession = useAppStore((state) => state.startSession);
  const acceptedNotice = useAppStore((state) => state.acceptedNotice);
  const latestOpenSession = useMemo(
    () =>
      [...sessions]
        .filter(
          (session) =>
            ["draft", "review", "loading"].includes(session.status) &&
            session.compatibility !== "outdated"
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0],
    [sessions]
  );
  const latestTopic = latestOpenSession ? topicById(latestOpenSession.topicId) : null;
  const featuredTopics = TOPICS.filter((topic) =>
    ["romance", "reunion", "career", "mind"].includes(topic.id)
  );
  const savedSessions = sessions.filter((session) => session.saved).length;

  const launchTopic = (topicId: TopicId) => {
    const session = startSession(topicId);
    navigate(sessionPath(session));
  };

  return (
    <ScreenFrame className="landing-screen" hideNav hideHeader title="온결 사주">
      <section className="landing-hero">
        <p className="landing-kicker">INTERACTIVE SAJU</p>
        <h1>복잡한 고민을 짧고 선명하게 정리합니다.</h1>
        <p>긴 해석 페이지 대신, 필요한 질문만 따라가면 카드형 결과를 확인할 수 있습니다.</p>
      </section>

      <section className="landing-stats" aria-label="서비스 정보">
        <div className="stat-chip">
          <IconLabel icon="clock">평균 5분 내 완료</IconLabel>
        </div>
        <div className="stat-chip">
          <IconLabel icon="save">저장된 결과 {savedSessions}개</IconLabel>
        </div>
        <div className="stat-chip">
          <IconLabel icon="share">링크 공유 가능</IconLabel>
        </div>
      </section>

      <section className="landing-featured">
        <p className="section-title">자주 선택하는 주제</p>
        <div className="landing-topic-grid">
          {featuredTopics.map((topic) => (
            <button
              key={topic.id}
              className={"landing-topic-tile topic-tone-" + topic.id}
              onClick={() => launchTopic(topic.id)}
            >
              <div className="landing-topic-head">
                <span className="topic-dot" style={{ backgroundColor: topic.accent }} />
                <strong>{topic.label}</strong>
              </div>
              <p>{topic.shortBlurb}</p>
              <span className="topic-meta">
                {topic.estimatedMinutes}분
                <UiIcon name="arrowRight" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {latestOpenSession && latestTopic ? (
        <Link className="panel resume-panel" to={sessionPath(latestOpenSession)}>
          <div>
            <p className="overline">이어 하기</p>
            <h3>{latestTopic.label} 상담을 이어서 진행합니다.</h3>
            <p>최근 업데이트 {formatDateTime(latestOpenSession.updatedAt)}</p>
          </div>
          <UiIcon name="arrowRight" />
        </Link>
      ) : (
        <Link className="panel resume-panel" to={acceptedNotice ? "/topics" : "/notice"}>
          <div>
            <p className="overline">시작 전 확인</p>
            <h3>해석 기준과 주의사항을 먼저 확인해 주세요.</h3>
            <p>이용 안내를 읽은 뒤 바로 상담을 시작할 수 있습니다.</p>
          </div>
          <UiIcon name="arrowRight" />
        </Link>
      )}

      <div className="action-stack">
        <Link className="button primary" to="/topics">
          <IconLabel icon="play">전체 주제 보기</IconLabel>
        </Link>
        <Link className="button ghost" to="/profile">
          <IconLabel icon="profile">프로필 설정</IconLabel>
        </Link>
      </div>
    </ScreenFrame>
  );
}

function NoticePage() {
  const navigate = useNavigate();
  const setAcceptedNotice = useAppStore((state) => state.setAcceptedNotice);

  return (
    <ScreenFrame
      eyebrow="서비스 유의사항"
      title="결과를 해석할 때 지킬 기준을 먼저 안내합니다."
      subtitle="단정적인 예언 대신 흐름과 선택 기준을 중심으로 결과를 제공합니다."
      footer={
        <div className="action-stack">
          <button
            className="button primary"
            onClick={() => {
              setAcceptedNotice(true);
              navigate("/topics");
            }}
          >
            <IconLabel icon="check">확인하고 시작</IconLabel>
          </button>
          <Link className="button ghost" to="/">
            <IconLabel icon="back">처음으로</IconLabel>
          </Link>
        </div>
      }
    >
      <div className="notice-list">
        <article className="panel notice-item">
          <IconLabel icon="notice">단정 대신 경향 중심으로 해석합니다.</IconLabel>
          <p>결과는 참고용 상담 문장입니다. 실제 결정은 현실 정보와 함께 판단해 주세요.</p>
        </article>
        <article className="panel notice-item">
          <IconLabel icon="clock">출생시간 미입력 시 큰 흐름 중심으로 제공됩니다.</IconLabel>
          <p>출생시간이 없으면 세부 시기보다 구조와 방향성 중심으로 안내됩니다.</p>
        </article>
        <article className="panel notice-item">
          <IconLabel icon="warning">의료·법률·재정 판단은 별도 근거가 필요합니다.</IconLabel>
          <p>전문 판단이 필요한 사안은 관련 자료와 전문가 의견을 함께 확인하세요.</p>
        </article>
      </div>
    </ScreenFrame>
  );
}

function ProfilePage() {
  const navigate = useNavigate();
  const savedProfile = useAppStore((state) => state.profile);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const [form, setForm] = useState<UserProfile>(savedProfile);

  useEffect(() => {
    setForm(savedProfile);
  }, [savedProfile]);

  const submit = () => {
    const normalized: UserProfile = {
      ...form,
      nickname: form.nickname.trim(),
      birthTime: form.birthDate && !form.birthTimeUnknown ? form.birthTime : "",
      birthTimeUnknown: !form.birthDate || form.birthTimeUnknown || !form.birthTime
    };

    updateProfile(normalized);
    navigate("/topics");
  };

  return (
    <ScreenFrame
      eyebrow="프로필"
      title="상담에 반영할 기본 정보를 준비해 주세요."
      subtitle="모든 항목은 선택입니다. 입력할수록 결과 카드가 더 구체적으로 바뀝니다."
      footer={
        <div className="action-stack">
          <button className="button primary" onClick={submit}>
            <IconLabel icon="save">저장하고 주제 선택</IconLabel>
          </button>
          <Link className="button ghost" to="/topics">
            <IconLabel icon="play">입력 없이 시작</IconLabel>
          </Link>
        </div>
      }
    >
      <div className="panel soft">
        <p className="overline">현재 입력 상태</p>
        <p>{formatProfileSummary(form)}</p>
      </div>

      <div className="stack compact-stack">
        <label className="field">
          <span>닉네임</span>
          <input
            placeholder="상담에서 사용할 이름"
            value={form.nickname}
            onChange={(event) =>
              setForm((current) => ({ ...current, nickname: event.target.value }))
            }
          />
        </label>

        <div className="info-grid profile-grid">
          <label className="field">
            <span>생년월일 (선택)</span>
            <input
              type="date"
              value={form.birthDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, birthDate: event.target.value }))
              }
            />
          </label>

          <label className="field">
            <span>출생시간 (선택)</span>
            <input
              type="time"
              value={form.birthTime}
              disabled={form.birthTimeUnknown || !form.birthDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, birthTime: event.target.value }))
              }
            />
          </label>
        </div>

        <label className="checkbox-row mini-checkbox">
          <input
            type="checkbox"
            checked={form.birthTimeUnknown}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                birthTimeUnknown: event.target.checked,
                birthTime: event.target.checked ? "" : current.birthTime || "12:00"
              }))
            }
          />
          <span>출생시간은 모름</span>
        </label>

        <div className="field">
          <span>성별</span>
          <div className="chip-row">
            {[
              { label: "여성", value: "female" },
              { label: "남성", value: "male" },
              { label: "기타", value: "other" }
            ].map((item) => (
              <button
                key={item.value}
                className={"chip" + (form.gender === item.value ? " active" : "")}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    gender: item.value as UserProfile["gender"]
                  }))
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

function TopicHomePage() {
  const navigate = useNavigate();
  const profile = useAppStore((state) => state.profile);
  const sessions = useAppStore((state) => state.sessions);
  const startSession = useAppStore((state) => state.startSession);
  const latestOpenSession = useMemo(
    () =>
      [...sessions]
        .filter(
          (session) =>
            ["draft", "review", "loading"].includes(session.status) &&
            session.compatibility !== "outdated"
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0],
    [sessions]
  );
  const profileReady = isProfileComplete(profile);

  const launchTopic = (topicId: TopicId, forceRestart = false) => {
    const session = startSession(topicId, forceRestart);
    navigate(sessionPath(session));
  };

  return (
    <ScreenFrame
      eyebrow="주제 선택"
      title="지금 고민과 가장 가까운 상담 주제를 고르세요."
      subtitle="진행 중인 주제는 이어서 시작하고, 새 주제는 즉시 질문이 열립니다."
    >
      <div className="panel soft profile-panel">
        <div>
          <p className="overline">프로필 상태</p>
          <h3>{profileReady ? "기본 정보 입력 완료" : "빠른 시작 모드"}</h3>
          <p>{formatProfileSummary(profile)}</p>
        </div>
        <Link className="button ghost small" to="/profile">
          <IconLabel icon="profile">프로필 수정</IconLabel>
        </Link>
      </div>

      {latestOpenSession ? (
        <Link className="panel continue-panel" to={sessionPath(latestOpenSession)}>
          <div>
            <p className="overline">진행 중 상담</p>
            <h3>{topicById(latestOpenSession.topicId).label} 상담을 이어서 진행합니다.</h3>
            <p>최근 업데이트 {formatDateTime(latestOpenSession.updatedAt)}</p>
          </div>
          <UiIcon name="arrowRight" />
        </Link>
      ) : null}

      <div className="topic-home-grid">
        {TOPICS.map((topic) => (
          <button
            key={topic.id}
            className={"topic-home-card topic-tone-" + topic.id}
            onClick={() => launchTopic(topic.id)}
          >
            <div className="topic-home-main">
              <span className="topic-dot" style={{ backgroundColor: topic.accent }} />
              <div>
                <strong>{topic.label}</strong>
                <p>{topic.shortBlurb}</p>
              </div>
            </div>
            <div className="topic-home-meta">
              <span>{topic.estimatedMinutes}분</span>
              <UiIcon name="arrowRight" />
            </div>
          </button>
        ))}
      </div>
    </ScreenFrame>
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
      <ScreenFrame
        eyebrow="세션 보호"
        title="질문 구조가 변경되어 기존 세션을 그대로 이어갈 수 없습니다."
        subtitle="기존 응답은 보호 상태로 남기고, 최신 버전 기준으로 새 세션을 시작합니다."
        footer={
          <div className="action-stack">
            <button
              className="button primary"
              onClick={() => {
                const next = startSession(session.topicId, true);
                navigate(sessionPath(next), { replace: true });
              }}
            >
              <IconLabel icon="play">현재 버전으로 다시 시작</IconLabel>
            </button>
            <Link className="button ghost" to="/topics">
              <IconLabel icon="back">주제 목록으로</IconLabel>
            </Link>
          </div>
        }
      >
        <div className="panel warning-panel">
          <p className="overline">호환성 상태</p>
          <h3>현재 질문 카탈로그와 기존 노드가 일치하지 않습니다.</h3>
          <p>실서비스에서는 마이그레이션 로그와 운영자 알림을 함께 남기는 구조를 권장합니다.</p>
        </div>
      </ScreenFrame>
    );
  }

  const flow = FLOW_MAP[session.topicId];
  const node = getNode(flow, session.currentNodeId);

  if (!node) {
    return <Navigate to={`/review/${session.id}`} replace />;
  }

  const progress = getProgressPercent(session);
  const topic = topicById(session.topicId);
  const currentStep = session.responses.length + 1;

  return (
    <ScreenFrame
      eyebrow={topic.label}
      title={node.prompt}
      subtitle={node.helper}
      footer={
        <div className="action-stack">
          <button
            className="button ghost"
            onClick={() => {
              if (session.responses.length === 0) {
                navigate("/topics");
                return;
              }
              goBack(session.id);
            }}
          >
            <IconLabel icon="back">이전 질문</IconLabel>
          </button>
          <Link className="button ghost" to={`/review/${session.id}`}>
            <IconLabel icon="edit">답변 검토</IconLabel>
          </Link>
        </div>
      }
    >
      <div className="panel soft session-progress-panel">
        <div className="progress-caption">
          <span>진행 단계</span>
          <span>
            {currentStep}/{flow.nodes.length} · {progress}%
          </span>
        </div>
        <div className="progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      {session.compatibility === "warning" ? (
        <div className="panel notice-panel">
          <IconLabel icon="warning">질문 카탈로그가 업데이트되어 최신 버전 기준으로 이어집니다.</IconLabel>
        </div>
      ) : null}

      <div className="choice-list">
        {node.options.map((option) => (
          <button
            key={option.id}
            className="choice-card"
            onClick={() => {
              const updated = submitAnswer(session.id, node.id, option.id);
              if (!updated) {
                return;
              }
              navigate(sessionPath(updated));
            }}
          >
            <div className="choice-head">
              <strong>{option.label}</strong>
              <UiIcon name="arrowRight" />
            </div>
            {option.description ? <p>{option.description}</p> : null}
          </button>
        ))}
      </div>
    </ScreenFrame>
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

  return (
    <ScreenFrame
      eyebrow="답변 검토"
      title="결과 생성 전에 답변을 다시 확인하세요."
      subtitle="여기서 수정한 항목은 이후 분기와 결과 카드에 즉시 반영됩니다."
      footer={
        <div className="action-stack">
          <button
            className="button primary"
            onClick={() => {
              markLoading(session.id);
              navigate(`/loading/${session.id}`);
            }}
          >
            <IconLabel icon="play">결과 생성 시작</IconLabel>
          </button>
          <Link className="button ghost" to={`/session/${session.id}`}>
            <IconLabel icon="back">질문으로 돌아가기</IconLabel>
          </Link>
        </div>
      }
    >
      <div className="panel soft">
        <p className="overline">기본 정보</p>
        <p>{formatProfileSummary(session.profileSnapshot)}</p>
      </div>

      {session.responses.length === 0 ? (
        <div className="panel">
          <h3>아직 답변한 질문이 없습니다.</h3>
          <p>질문 화면으로 돌아가 첫 답변부터 시작해 주세요.</p>
        </div>
      ) : (
        <div className="review-list">
          {session.responses.map((response, index) => {
            const node = getNode(flow, response.nodeId);
            return (
              <article key={response.nodeId} className="panel review-item">
                <div className="review-main">
                  <span className="step-index">{index + 1}</span>
                  <div>
                    <p className="overline">{node?.prompt}</p>
                    <h3>{response.label}</h3>
                  </div>
                </div>
                <button
                  className="button secondary small"
                  onClick={() => {
                    rewindToNode(session.id, response.nodeId);
                    navigate(`/session/${session.id}`);
                  }}
                >
                  <IconLabel icon="edit">수정</IconLabel>
                </button>
              </article>
            );
          })}
        </div>
      )}

      {session.profileSnapshot.birthTimeUnknown ? (
        <div className="panel notice-panel">
          <IconLabel icon="clock">
            출생시간 미입력 상태라 결과는 세부 시기보다 큰 흐름 중심으로 생성됩니다.
          </IconLabel>
        </div>
      ) : null}
    </ScreenFrame>
  );
}

function LoadingPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const sessions = useAppStore((state) => state.sessions);
  const generateResult = useAppStore((state) => state.generateResult);
  const markLoading = useAppStore((state) => state.markLoading);
  const session = sessions.find((entry) => entry.id === sessionId);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (session.status !== "loading") {
      markLoading(session.id);
    }

    const timer = window.setTimeout(() => {
      const result = generateResult(session.id);
      if (result) {
        navigate(resultPath(result.id), { replace: true });
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [generateResult, markLoading, navigate, session]);

  if (!session) {
    return <Navigate to="/topics" replace />;
  }

  return (
    <ScreenFrame
      eyebrow="결과 생성"
      title="답변 흐름을 분석하고 결과를 생성하고 있습니다."
      subtitle="로컬 결과를 먼저 생성한 뒤, 연결 가능 상태에서는 확장 소스로 전환할 수 있게 설계했습니다."
    >
      <div className="loading-wrap">
        <div className="loading-spinner" aria-hidden="true" />
        <ul className="loading-steps">
          <li>
            <IconLabel icon="check">질문 태그 수집</IconLabel>
          </li>
          <li>
            <IconLabel icon="check">주제 기본 템플릿 병합</IconLabel>
          </li>
          <li>
            <IconLabel icon="check">신호 태그 기반 카드 조정</IconLabel>
          </li>
        </ul>
      </div>
    </ScreenFrame>
  );
}

function ResultPage() {
  const { resultId } = useParams();
  const navigate = useNavigate();
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

  const topic = topicById(result.topicId);
  const activeShare = session.shareToken
    ? useAppStore.getState().shares.find((share) => share.token === session.shareToken)
    : undefined;

  return (
    <ScreenFrame
      eyebrow={topic.label}
      title={result.summary}
      subtitle="카드 단위로 읽고, 저장하거나 공유 링크를 발급할 수 있습니다."
      footer={
        <div className="action-stack">
          <button className="button primary" onClick={() => saveSession(session.id)}>
            <IconLabel icon="save">{session.saved ? "결과 저장됨" : "결과 저장"}</IconLabel>
          </button>
          <button
            className="button secondary"
            onClick={async () => {
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
          >
            <IconLabel icon="share">공유 링크 만들기</IconLabel>
          </button>
          <button className="button ghost" onClick={() => navigate("/topics")}>
            <IconLabel icon="play">다른 주제 시작</IconLabel>
          </button>
        </div>
      }
    >
      <div className="panel result-summary">
        <div className="badge-row">
          <span className="badge">{topic.label}</span>
          <span className="badge">{result.generationSource}</span>
          {session.saved ? <span className="badge">저장됨</span> : null}
        </div>
        <p className="muted">생성 시각 {formatDateTime(result.generatedAt)}</p>
        {result.accuracyNote ? <p className="accuracy-note">{result.accuracyNote}</p> : null}
      </div>

      {copied ? (
        <div className="panel highlight">
          <p className="overline">복사된 공유 링크</p>
          <p className="whitespace">{copied}</p>
        </div>
      ) : null}

      {activeShare && !isShareExpired(activeShare) ? (
        <div className="panel soft">
          <p className="overline">활성 링크</p>
          <p>{absoluteShareUrl(activeShare.urlPath)}</p>
          <small>만료일 {formatDate(activeShare.expiresAt)}</small>
        </div>
      ) : null}

      {result.recommendedQuestions.length > 0 ? (
        <div className="panel soft">
          <p className="overline">추가로 보면 좋은 질문</p>
          <ul className="plain-list">
            {result.recommendedQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <ResultCards result={result} />
    </ScreenFrame>
  );
}

function ArchivePage() {
  const results = useAppStore((state) => state.results);
  const sessions = useAppStore((state) => state.sessions);
  const savedResults = useMemo(
    () =>
      [...results]
        .filter((result) => sessions.find((session) => session.resultId === result.id)?.saved)
        .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    [results, sessions]
  );

  return (
    <ScreenFrame
      eyebrow="보관함"
      title="저장한 결과를 다시 확인할 수 있습니다."
      subtitle="최근 생성한 결과부터 시간순으로 정렬됩니다."
      footer={
        <div className="action-stack">
          <Link className="button primary" to="/topics">
            <IconLabel icon="play">새 상담 시작</IconLabel>
          </Link>
        </div>
      }
    >
      {savedResults.length === 0 ? (
        <div className="panel empty-state">
          <h3>아직 저장한 결과가 없습니다.</h3>
          <p>결과 화면에서 저장 버튼을 누르면 이곳에 보관됩니다.</p>
        </div>
      ) : (
        <div className="archive-list">
          {savedResults.map((result) => (
            <Link key={result.id} className="panel result-link" to={resultPath(result.id)}>
              <div className="archive-head">
                <p className="overline">{topicById(result.topicId).label}</p>
                <UiIcon name="arrowRight" />
              </div>
              <h3>{result.summary}</h3>
              <p>{formatDateTime(result.generatedAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </ScreenFrame>
  );
}

function SharedPage() {
  const { token } = useParams();
  const shares = useAppStore((state) => state.shares);
  const results = useAppStore((state) => state.results);
  const share = shares.find((entry) => entry.token === token);
  const result = share ? results.find((entry) => entry.id === share.resultId) : undefined;

  if (!share || !result || isShareExpired(share)) {
    return (
      <ScreenFrame
        eyebrow="공유 결과"
        title="링크가 만료되었거나 비활성화되었습니다."
        subtitle="유효한 링크가 아니면 결과를 노출하지 않도록 안전하게 차단합니다."
        footer={
          <Link className="button primary" to="/">
            <IconLabel icon="play">홈으로 이동</IconLabel>
          </Link>
        }
      >
        <div className="panel warning-panel">
          <IconLabel icon="warning">공유 링크 상태를 확인해 주세요.</IconLabel>
        </div>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame
      eyebrow="공유 결과"
      title={result.summary}
      subtitle={`만료일 ${formatDate(share.expiresAt)}까지 확인할 수 있습니다.`}
      footer={
        <Link className="button primary" to="/">
          <IconLabel icon="play">내 상담 시작</IconLabel>
        </Link>
      }
    >
      <ResultCards result={result} />
    </ScreenFrame>
  );
}

function SettingsPage() {
  const networkStatus = useAppStore((state) => state.networkStatus);
  const sessions = useAppStore((state) => state.sessions);
  const results = useAppStore((state) => state.results);
  const shares = useAppStore((state) => state.shares);
  const disableShare = useAppStore((state) => state.disableShare);
  const deleteAllData = useAppStore((state) => state.deleteAllData);

  return (
    <ScreenFrame
      eyebrow="설정"
      title="데이터와 공유 링크를 관리합니다."
      subtitle="로컬 상태, 네트워크, Firebase 연결 가능 여부를 함께 확인할 수 있습니다."
    >
      <div className="info-grid settings-grid">
        <div className="panel soft">
          <p className="overline">Firebase</p>
          <h3>
            <IconLabel icon="cloud">
              {isFirebaseConfigured ? "환경 변수 연결 가능" : "환경 변수 미설정"}
            </IconLabel>
          </h3>
          <p>Hosting/Auth/Firestore/Functions 기준 구조로 확장할 수 있습니다.</p>
        </div>
        <div className="panel soft">
          <p className="overline">네트워크</p>
          <h3>
            <IconLabel icon="network">{networkStatus === "online" ? "온라인" : "오프라인"}</IconLabel>
          </h3>
          <p>오프라인 상태에서도 로컬 세션 복원과 결과 조회는 가능합니다.</p>
        </div>
      </div>

      <div className="panel">
        <p className="overline">로컬 데이터 현황</p>
        <div className="metric-row">
          <span>세션 {sessions.length}</span>
          <span>결과 {results.length}</span>
          <span>공유 링크 {shares.length}</span>
        </div>
      </div>

      {shares.length > 0 ? (
        <div className="share-list">
          {shares.map((share) => (
            <article key={share.token} className="panel share-item">
              <div>
                <p className="overline">공유 링크</p>
                <h3>{absoluteShareUrl(share.urlPath)}</h3>
                <p>
                  상태 {share.status} · 만료 {formatDate(share.expiresAt)}
                </p>
              </div>
              {share.status === "active" ? (
                <button className="button secondary small" onClick={() => disableShare(share.token)}>
                  <IconLabel icon="link">비활성화</IconLabel>
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="panel soft">
          <p className="overline">공유 링크</p>
          <p>아직 생성된 공유 링크가 없습니다.</p>
        </div>
      )}

      <div className="panel warning-panel">
        <p className="overline">데이터 삭제</p>
        <p>프로필, 세션, 결과, 공유 링크를 모두 삭제합니다.</p>
        <button
          className="button danger"
          onClick={() => {
            if (window.confirm("저장된 데이터를 모두 삭제할까요?")) {
              deleteAllData();
            }
          }}
        >
          <IconLabel icon="trash">로컬 데이터 전체 삭제</IconLabel>
        </button>
      </div>
    </ScreenFrame>
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
    <ScreenFrame
      eyebrow="운영 구조"
      title="운영 지표와 카탈로그 규모를 확인합니다."
      subtitle="현재 화면은 로컬 프로토타입이며 동일한 구조를 Firestore/Functions로 확장할 수 있습니다."
    >
      <div className="panel">
        <p className="overline">요약 지표</p>
        <div className="metric-row">
          <span>
            <IconLabel icon="chart">주제 {TOPICS.length}개</IconLabel>
          </span>
          <span>
            <IconLabel icon="chart">질문 노드 {totalNodes}개</IconLabel>
          </span>
          <span>
            <IconLabel icon="chart">신호 템플릿 {SIGNAL_TEMPLATES.length}개</IconLabel>
          </span>
        </div>
      </div>

      <div className="panel soft">
        <p className="overline">주제별 통계</p>
        <div className="ops-table">
          {topicMetrics.map((metric) => (
            <div key={metric.topicId} className="ops-row">
              <strong>{metric.label}</strong>
              <span>진입 {metric.entries}</span>
              <span>완주율 {metric.completionRate}%</span>
              <span>저장률 {metric.saveRate}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <p className="overline">질문 이탈 후보</p>
        <div className="ops-table">
          {dropoutCandidates.length === 0 ? (
            <div className="ops-row">
              <span>이탈 후보 데이터가 아직 없습니다.</span>
            </div>
          ) : (
            dropoutCandidates.map((metric) => (
              <div key={metric.nodeId} className="ops-row column">
                <strong>{metric.prompt}</strong>
                <span>
                  {topicById(metric.topicId as TopicId).label} · 응답 {metric.answered} · 이탈 후보{" "}
                  {metric.pendingDropouts} · 이탈률 {metric.dropoutRate}%
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </ScreenFrame>
  );
}

function NotFoundPage() {
  return (
    <ScreenFrame
      eyebrow="404"
      title="요청한 화면을 찾을 수 없습니다."
      subtitle="경로가 잘못되었거나 만료된 공유 링크일 수 있습니다."
      footer={
        <Link className="button primary" to="/">
          <IconLabel icon="play">홈으로 이동</IconLabel>
        </Link>
      }
    >
      <div className="panel warning-panel">
        <IconLabel icon="warning">링크 상태를 확인한 뒤 다시 시도해 주세요.</IconLabel>
      </div>
    </ScreenFrame>
  );
}
