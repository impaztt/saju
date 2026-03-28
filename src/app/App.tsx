import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams
} from "react-router-dom";

import { SIGNAL_TEMPLATES } from "../data/resultTemplates";
import { FLOW_MAP } from "../data/questionFlows";
import { DEFAULT_BANNER, TOPICS } from "../data/topics";
import { getNode, getProgressPercent } from "../lib/engine";
import { isFirebaseConfigured } from "../lib/firebase";
import { computeQuestionMetrics, computeTopicMetrics } from "../lib/ops";
import { isShareExpired } from "../lib/share";
import { useAppStore } from "../store/useAppStore";
import type { ConsultationResult, ConsultationSession, ShareRecord, TopicDefinition, TopicId, UserProfile } from "../types";

function isProfileComplete(profile: UserProfile) {
  return Boolean(
    profile.nickname.trim() &&
      profile.birthDate &&
      profile.gender &&
      (profile.birthTimeUnknown || profile.birthTime)
  );
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
  const timeLabel = profile.birthTimeUnknown ? "출생시간 모름" : profile.birthTime || "시간 미입력";
  return `${profile.nickname || "이름 미입력"} · ${profile.birthDate || "생일 미입력"} · ${calendarLabel(
    profile.birthCalendar
  )} · ${timeLabel} · ${genderLabel(profile.gender)}`;
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

function ScreenFrame({
  eyebrow,
  title,
  subtitle,
  children,
  footer
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="screen">
      <div className="topbar">
        <Link className="brand" to="/">
          온결 사주
        </Link>
        <div className="topbar-links">
          <Link to="/archive">보관함</Link>
          <Link to="/settings">설정</Link>
        </div>
      </div>
      <header className="screen-header">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
      </header>
      <section className="screen-body">{children}</section>
      {footer ? <footer className="screen-footer">{footer}</footer> : null}
    </main>
  );
}

function Banner({ tone = "notice", title, body, actionLabel, actionPath }: typeof DEFAULT_BANNER) {
  return (
    <div className={`panel banner ${tone}`}>
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
      {actionLabel && actionPath ? (
        <Link className="button secondary small" to={actionPath}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function ResultCards({ result }: { result: ConsultationResult }) {
  return (
    <div className="stack">
      {result.cards.map((card) => (
        <article key={card.key} className="panel result-card">
          <p className="overline">{card.title}</p>
          <p className="card-body whitespace">{card.body}</p>
        </article>
      ))}
    </div>
  );
}

function AppRouter() {
  const networkStatus = useAppStore((state) => state.networkStatus);
  const setNetworkStatus = useAppStore((state) => state.setNetworkStatus);
  const lastError = useAppStore((state) => state.lastError);
  const clearError = useAppStore((state) => state.clearError);

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
        <div className="global-alert warning">오프라인 상태입니다. 로컬에 저장된 세션과 결과 위주로 동작합니다.</div>
      ) : null}
      {lastError ? <div className="global-alert error">{lastError}</div> : null}
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
  const profile = useAppStore((state) => state.profile);
  const acceptedNotice = useAppStore((state) => state.acceptedNotice);
  const sessions = useAppStore((state) => state.sessions);
  const latestOpenSession = useMemo(
    () =>
      [...sessions]
        .filter((session) => ["draft", "review", "loading"].includes(session.status) && session.compatibility !== "outdated")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0],
    [sessions]
  );
  const nextPath = !acceptedNotice ? "/notice" : isProfileComplete(profile) ? "/topics" : "/profile";
  const nextLabel = !acceptedNotice ? "유의사항 확인" : isProfileComplete(profile) ? "상담 시작" : "기본 정보 입력";

  return (
    <ScreenFrame
      eyebrow="모바일 우선 대화형 사주 상담"
      title="지금 가장 궁금한 흐름부터 짧게 묻고 카드형 결과로 정리합니다."
      subtitle="긴 사주풀이 대신, 현재 문제를 먼저 고르고 흐름에 맞는 질문만 따라가면 됩니다."
      footer={
        <div className="action-stack">
          <Link className="button primary" to={nextPath}>
            {nextLabel}
          </Link>
          <Link className="button ghost" to="/archive">
            저장한 결과 보기
          </Link>
        </div>
      }
    >
      <div className="hero-panel">
        <div>
          <p className="eyebrow">핵심 UX</p>
          <h2>한 화면에는 하나의 핵심 행동만 남깁니다.</h2>
          <p>
            사용자는 탭만 하며 흐름을 따라가고, 결과는 긴 문단 대신 10개의 카드 블록으로 정리됩니다.
          </p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>10개</strong>
            <span>상담 주제</span>
          </div>
          <div>
            <strong>분기형</strong>
            <span>질문 흐름</span>
          </div>
          <div>
            <strong>로컬 복원</strong>
            <span>중간 이탈 대응</span>
          </div>
        </div>
      </div>

      <Banner {...DEFAULT_BANNER} />

      {latestOpenSession ? (
        <div className="panel highlight">
          <p className="overline">이어 보기</p>
          <h3>{topicById(latestOpenSession.topicId).label} 상담이 남아 있습니다.</h3>
          <p>
            현재 상태: {latestOpenSession.status === "review" ? "답변 검토" : latestOpenSession.status === "loading" ? "결과 생성 중" : "질문 진행 중"}
          </p>
          <Link className="button secondary" to={sessionPath(latestOpenSession)}>
            이어서 보기
          </Link>
        </div>
      ) : null}

      <div className="stack">
        <div className="panel info-grid">
          <div>
            <p className="overline">질문 방식</p>
            <strong>상태에 따라 다른 질문</strong>
            <p>같은 연애 주제라도 썸, 연애 중, 애매한 관계, 상대 없음에 따라 흐름이 달라집니다.</p>
          </div>
          <div>
            <p className="overline">결과 방식</p>
            <strong>10개 카드 블록</strong>
            <p>핵심 요약, 지금의 흐름, 가까운 시기, 해야 할 행동까지 차분한 톤으로 제공합니다.</p>
          </div>
        </div>
        <div className="mini-links">
          <Link to="/topics">주제 둘러보기</Link>
          <Link to="/ops">운영 구조 보기</Link>
          <Link to="/settings">데이터 관리</Link>
        </div>
      </div>
    </ScreenFrame>
  );
}

function NoticePage() {
  const navigate = useNavigate();
  const profile = useAppStore((state) => state.profile);
  const setAcceptedNotice = useAppStore((state) => state.setAcceptedNotice);

  return (
    <ScreenFrame
      eyebrow="서비스 유의사항"
      title="참고용 해석이라는 점을 먼저 안내합니다."
      subtitle="이 서비스는 흐름과 경향을 정리하는 상담형 도구입니다. 중요한 현실 판단은 실제 정보와 함께 보셔야 합니다."
      footer={
        <div className="action-stack">
          <button
            className="button primary"
            onClick={() => {
              setAcceptedNotice(true);
              navigate(isProfileComplete(profile) ? "/topics" : "/profile");
            }}
          >
            안내를 확인했어요
          </button>
          <Link className="button ghost" to="/">
            처음으로
          </Link>
        </div>
      }
    >
      <div className="stack">
        <div className="panel">
          <p className="overline">해석 기준</p>
          <h3>단정 대신 흐름 중심으로 안내합니다.</h3>
          <p>결과는 경향, 분위기, 리듬을 중심으로 작성되며 확정적인 예언처럼 표현하지 않습니다.</p>
        </div>
        <div className="panel">
          <p className="overline">출생시간 모름 안내</p>
          <h3>출생시간을 모르면 세부 시기감보다 큰 흐름 위주로 해석합니다.</h3>
          <p>정확도에 관한 안내 문구가 결과 카드 상단에도 다시 노출됩니다.</p>
        </div>
        <div className="panel">
          <p className="overline">결정 주의</p>
          <h3>의료, 법률, 재정 판단은 별도 근거와 함께 보세요.</h3>
          <p>불안을 자극하거나 희망 고문처럼 느껴지는 문장은 피하고, 현실적인 선택 기준을 함께 제시합니다.</p>
        </div>
      </div>
    </ScreenFrame>
  );
}

function ProfilePage() {
  const navigate = useNavigate();
  const savedProfile = useAppStore((state) => state.profile);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const [form, setForm] = useState<UserProfile>(savedProfile);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(savedProfile);
  }, [savedProfile]);

  const submit = () => {
    if (!form.nickname.trim()) {
      setError("닉네임을 입력해 주세요.");
      return;
    }

    if (!form.birthDate) {
      setError("생년월일을 입력해 주세요.");
      return;
    }

    if (!form.birthTimeUnknown && !form.birthTime) {
      setError("출생시간을 입력하거나 모름으로 설정해 주세요.");
      return;
    }

    updateProfile(form);
    navigate("/topics");
  };

  return (
    <ScreenFrame
      eyebrow="기본 정보 입력"
      title="상담 흐름에 필요한 기본 정보를 먼저 입력합니다."
      subtitle="입력한 정보는 로컬 세션 복원과 결과 정확도 안내에 사용됩니다."
      footer={
        <div className="action-stack">
          <button className="button primary" onClick={submit}>
            저장하고 주제 선택
          </button>
          <Link className="button ghost" to="/notice">
            유의사항 다시 보기
          </Link>
        </div>
      }
    >
      <div className="stack">
        <label className="field">
          <span>닉네임</span>
          <input
            value={form.nickname}
            onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))}
            placeholder="예: 온결"
          />
        </label>
        <label className="field">
          <span>생년월일</span>
          <input
            type="date"
            value={form.birthDate}
            onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
          />
        </label>
        <div className="field">
          <span>양력 / 음력</span>
          <div className="chip-row">
            {[
              { label: "양력", value: "solar" },
              { label: "음력", value: "lunar" }
            ].map((item) => (
              <button
                key={item.value}
                className={`chip ${form.birthCalendar === item.value ? "active" : ""}`}
                onClick={() => setForm((current) => ({ ...current, birthCalendar: item.value as UserProfile["birthCalendar"] }))}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>출생시간</span>
          <input
            type="time"
            value={form.birthTime}
            disabled={form.birthTimeUnknown}
            onChange={(event) => setForm((current) => ({ ...current, birthTime: event.target.value }))}
          />
        </label>
        <label className="checkbox-row">
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
          <span>출생시간을 모르겠어요</span>
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
                className={`chip ${form.gender === item.value ? "active" : ""}`}
                onClick={() => setForm((current) => ({ ...current, gender: item.value as UserProfile["gender"] }))}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="panel soft">
          <p className="overline">정확도 안내</p>
          <p>
            출생시간을 모르면 세부 시기 판단보다 큰 흐름 중심으로 해석됩니다. 그래도 상담 진행과 저장은 정상적으로 가능합니다.
          </p>
        </div>
        {error ? <div className="inline-error">{error}</div> : null}
      </div>
    </ScreenFrame>
  );
}

function TopicHomePage() {
  const navigate = useNavigate();
  const acceptedNotice = useAppStore((state) => state.acceptedNotice);
  const profile = useAppStore((state) => state.profile);
  const sessions = useAppStore((state) => state.sessions);
  const startSession = useAppStore((state) => state.startSession);

  if (!acceptedNotice) {
    return <Navigate to="/notice" replace />;
  }

  if (!isProfileComplete(profile)) {
    return <Navigate to="/profile" replace />;
  }

  const draftSessions = [...sessions]
    .filter((session) => ["draft", "review", "loading"].includes(session.status) && session.compatibility !== "outdated")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 2);

  const launchTopic = (topicId: TopicId, forceRestart = false) => {
    const session = startSession(topicId, forceRestart);
    navigate(sessionPath(session));
  };

  return (
    <ScreenFrame
      eyebrow="주제 선택 홈"
      title="지금 가장 먼저 보고 싶은 문제를 골라 주세요."
      subtitle="탭 한 번으로 시작되고, 선택한 상태에 따라 다음 질문이 달라집니다."
      footer={
        <div className="action-stack">
          <Link className="button primary" to="/archive">
            이전 결과 다시 보기
          </Link>
          <Link className="button ghost" to="/profile">
            기본 정보 수정
          </Link>
        </div>
      }
    >
      <div className="panel soft">
        <p className="overline">현재 프로필</p>
        <h3>{profile.nickname || "이름 미입력"}</h3>
        <p>{formatProfileSummary(profile)}</p>
      </div>

      {draftSessions.length > 0 ? (
        <div className="stack">
          {draftSessions.map((session) => (
            <div key={session.id} className="panel highlight">
              <p className="overline">이어 보기</p>
              <h3>{topicById(session.topicId).label}</h3>
              <p>{session.status === "review" ? "답변 검토 단계" : session.status === "loading" ? "결과 생성 중" : "질문 진행 중"}</p>
              <div className="inline-actions">
                <Link className="button secondary small" to={sessionPath(session)}>
                  이어서 보기
                </Link>
                <button className="button ghost small" onClick={() => launchTopic(session.topicId, true)}>
                  새로 시작
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="topic-grid">
        {TOPICS.map((topic) => (
          <button
            key={topic.id}
            className="topic-card"
            style={{ borderColor: topic.accent }}
            onClick={() => launchTopic(topic.id)}
          >
            <div className="topic-meta">
              <span>{topic.label}</span>
              <strong>{topic.estimatedMinutes}분</strong>
            </div>
            <p>{topic.shortBlurb}</p>
            <small>{topic.featuredPrompt}</small>
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
        title="질문 구조가 바뀌어 기존 진행 세션을 그대로 이어갈 수 없습니다."
        subtitle="이전 응답은 보존하고, 현재 버전 기준으로 새 세션을 시작하도록 안내합니다."
        footer={
          <div className="action-stack">
            <button
              className="button primary"
              onClick={() => {
                const next = startSession(session.topicId, true);
                navigate(sessionPath(next), { replace: true });
              }}
            >
              현재 버전으로 새로 시작
            </button>
            <Link className="button ghost" to="/topics">
              주제 홈으로
            </Link>
          </div>
        }
      >
        <div className="panel warning-panel">
          <p className="overline">호환성 상태</p>
          <h3>기존 질문 노드와 현재 카탈로그가 일치하지 않습니다.</h3>
          <p>실서비스에서는 이전 결과 보존, 세션 마이그레이션 로그, 운영자 알림과 함께 처리하는 구조를 권장합니다.</p>
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
            이전 질문
          </button>
          <Link className="button ghost" to={`/review/${session.id}`}>
            답변 검토
          </Link>
        </div>
      }
    >
      <div className="progress-wrap">
        <div className="progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <small>{session.responses.length + 1} / {flow.nodes.length}</small>
      </div>
      {session.compatibility === "warning" ? (
        <div className="panel soft">
          <p className="overline">버전 주의</p>
          <p>질문 카탈로그가 업데이트되어 현재 세션을 최신 버전 기준으로 이어서 보여줍니다.</p>
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
            <strong>{option.label}</strong>
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
      title="지금까지의 답변을 마지막으로 확인해 주세요."
      subtitle="여기서 수정하면 이후 분기와 결과 카드가 함께 바뀝니다."
      footer={
        <div className="action-stack">
          <button
            className="button primary"
            onClick={() => {
              markLoading(session.id);
              navigate(`/loading/${session.id}`);
            }}
          >
            결과 보기
          </button>
          <Link className="button ghost" to={`/session/${session.id}`}>
            질문으로 돌아가기
          </Link>
        </div>
      }
    >
      <div className="panel soft">
        <p className="overline">기본 정보</p>
        <p>{formatProfileSummary(session.profileSnapshot)}</p>
      </div>
      <div className="stack">
        {session.responses.map((response) => {
          const node = getNode(flow, response.nodeId);
          return (
            <div key={response.nodeId} className="panel review-item">
              <div>
                <p className="overline">{node?.prompt}</p>
                <h3>{response.label}</h3>
              </div>
              <button
                className="button secondary small"
                onClick={() => {
                  rewindToNode(session.id, response.nodeId);
                  navigate(`/session/${session.id}`);
                }}
              >
                수정
              </button>
            </div>
          );
        })}
      </div>
      {session.profileSnapshot.birthTimeUnknown ? (
        <div className="panel notice-panel">
          <p className="overline">정확도 참고</p>
          <p>출생시간을 모르는 상태라 결과는 세부 시기보다 큰 흐름 중심으로 정리됩니다.</p>
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
      title="현재 답변 흐름을 정리하고 있습니다."
      subtitle="기본 결과를 먼저 만들고, 네트워크가 가능하면 확장 결과 소스로 전환할 수 있는 구조를 기준으로 설계했습니다."
    >
      <div className="loading-stack">
        <div className="loading-orb" />
        <div className="panel soft">
          <p className="overline">생성 단계</p>
          <ul className="plain-list">
            <li>질문 태그 수집</li>
            <li>주제별 기본 템플릿 병합</li>
            <li>신호 태그 기반 카드 조정</li>
          </ul>
        </div>
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
      subtitle="결과는 카드 단위로 나누어 읽을 수 있고, 저장하거나 공유 링크를 만들 수 있습니다."
      footer={
        <div className="action-stack">
          <button className="button primary" onClick={() => saveSession(session.id)}>
            {session.saved ? "저장됨" : "결과 저장"}
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
            공유 링크 만들기
          </button>
          <button className="button ghost" onClick={() => navigate("/topics")}>다른 주제 보기</button>
        </div>
      }
    >
      <div className="panel hero-result">
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
          <p className="overline">공유 링크</p>
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
      eyebrow="이전 결과"
      title="저장해 둔 결과를 다시 읽을 수 있습니다."
      subtitle="주제, 생성 시각, 요약 문장을 기준으로 보관합니다."
      footer={
        <div className="action-stack">
          <Link className="button primary" to="/topics">
            새 상담 시작
          </Link>
        </div>
      }
    >
      {savedResults.length === 0 ? (
        <div className="panel empty-state">
          <h3>아직 저장한 결과가 없습니다.</h3>
          <p>결과 화면에서 저장 버튼을 누르면 이곳에서 다시 볼 수 있습니다.</p>
        </div>
      ) : (
        <div className="stack">
          {savedResults.map((result) => (
            <Link key={result.id} className="panel result-link" to={resultPath(result.id)}>
              <p className="overline">{topicById(result.topicId).label}</p>
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
        title="공유 링크가 만료되었거나 비활성화되었습니다."
        subtitle="실서비스에서는 만료 안내, 재발급 요청, 관리자 비활성화 사유를 함께 노출하는 흐름을 권장합니다."
        footer={<Link className="button primary" to="/">홈으로</Link>}
      >
        <div className="panel warning-panel">
          <p className="overline">링크 상태</p>
          <p>만료 또는 비활성화된 링크는 결과를 직접 노출하지 않고 안전하게 차단합니다.</p>
        </div>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame
      eyebrow="공유 결과"
      title={result.summary}
      subtitle={`만료일 ${formatDate(share.expiresAt)}까지 읽을 수 있는 링크입니다.`}
      footer={<Link className="button primary" to="/">내 상담 시작</Link>}
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
      eyebrow="설정 / 데이터 관리"
      title="세션, 공유 링크, 로컬 데이터를 관리합니다."
      subtitle="Firebase 연결 상태와 현재 저장량을 함께 확인할 수 있습니다."
    >
      <div className="stack">
        <div className="panel info-grid">
          <div>
            <p className="overline">Firebase</p>
            <strong>{isFirebaseConfigured ? "연결 가능" : "환경 변수 미설정"}</strong>
            <p>Hosting, Auth, Firestore, Functions, Storage, Analytics, Remote Config 기준 구조로 설계했습니다.</p>
          </div>
          <div>
            <p className="overline">네트워크</p>
            <strong>{networkStatus === "online" ? "온라인" : "오프라인"}</strong>
            <p>오프라인일 때도 로컬 세션 복원과 기본 결과 확인은 가능합니다.</p>
          </div>
        </div>
        <div className="panel soft">
          <p className="overline">로컬 데이터 현황</p>
          <ul className="plain-list">
            <li>세션 {sessions.length}개</li>
            <li>결과 {results.length}개</li>
            <li>공유 링크 {shares.length}개</li>
          </ul>
        </div>
        <div className="stack">
          {shares.map((share) => (
            <div key={share.token} className="panel review-item">
              <div>
                <p className="overline">공유 링크</p>
                <h3>{absoluteShareUrl(share.urlPath)}</h3>
                <p>상태 {share.status} · 만료 {formatDate(share.expiresAt)}</p>
              </div>
              {share.status === "active" ? (
                <button className="button secondary small" onClick={() => disableShare(share.token)}>
                  비활성화
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <div className="panel warning-panel">
          <p className="overline">삭제 정책</p>
          <p>데이터 삭제 시 로컬에 저장된 프로필, 세션, 결과, 공유 링크를 모두 제거합니다.</p>
          <button
            className="button danger"
            onClick={() => {
              if (window.confirm("저장된 데이터를 모두 삭제할까요?")) {
                deleteAllData();
              }
            }}
          >
            로컬 데이터 전체 삭제
          </button>
        </div>
      </div>
    </ScreenFrame>
  );
}

function OpsPage() {
  const sessions = useAppStore((state) => state.sessions);
  const topicMetrics = useMemo(() => computeTopicMetrics(sessions), [sessions]);
  const questionMetrics = useMemo(() => computeQuestionMetrics(sessions), [sessions]);
  const totalNodes = Object.values(FLOW_MAP).reduce((sum, flow) => sum + flow.nodes.length, 0);

  return (
    <ScreenFrame
      eyebrow="운영 구조"
      title="운영자 기능과 통계 구조를 한 화면에서 확인합니다."
      subtitle="현재 화면은 로컬 프로토타입이지만, 같은 구조를 Firestore 카탈로그와 Functions로 확장할 수 있게 설계했습니다."
    >
      <div className="stack">
        <div className="panel info-grid">
          <div>
            <p className="overline">카탈로그 규모</p>
            <strong>{TOPICS.length}개 주제</strong>
            <p>질문 노드 {totalNodes}개, 결과 신호 템플릿 {SIGNAL_TEMPLATES.length}개 기준.</p>
          </div>
          <div>
            <p className="overline">관리 모듈</p>
            <strong>주제 / 질문 / 분기 / 결과 / 배너</strong>
            <p>운영자 UI에서는 카탈로그 CRUD, 배포 버전, 통계 대시보드를 분리하는 구조를 권장합니다.</p>
          </div>
        </div>

        <div className="panel soft">
          <p className="overline">운영자 기능 구조</p>
          <ul className="plain-list">
            <li>주제 관리: 노출 순서, 강조 문구, 예상 소요 시간, 배너 연결</li>
            <li>질문 노드 관리: ID, 질문 문구, 보조 문구, 질문 타입, 버전</li>
            <li>선택지 및 분기 규칙 관리: 다음 노드, 결과 반영 태그, 비활성화 여부</li>
            <li>결과 문구 템플릿 관리: 기본 주제 템플릿과 태그 기반 덮어쓰기 템플릿</li>
            <li>공지/배너 관리: 공지 배너, 긴급 점검 문구, 진입별 배너 우선순위</li>
          </ul>
        </div>

        <div className="panel">
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
            {questionMetrics
              .filter((metric) => metric.pendingDropouts > 0)
              .sort((a, b) => b.dropoutRate - a.dropoutRate)
              .slice(0, 8)
              .map((metric) => (
                <div key={metric.nodeId} className="ops-row column">
                  <strong>{metric.prompt}</strong>
                  <span>
                    {topicById(metric.topicId as TopicId).label} · 응답 {metric.answered} · 이탈 후보 {metric.pendingDropouts} · 이탈률 {metric.dropoutRate}%
                  </span>
                </div>
              ))}
          </div>
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
      subtitle="잘못된 경로이거나 공유 링크가 더 이상 유효하지 않을 수 있습니다."
      footer={<Link className="button primary" to="/">홈으로</Link>}
    >
      <div className="panel warning-panel">
        <p className="overline">안내</p>
        <p>서비스에서는 잘못된 공유 링크, 만료 링크, 비활성화 링크를 구분해 안내하는 것이 좋습니다.</p>
      </div>
    </ScreenFrame>
  );
}
