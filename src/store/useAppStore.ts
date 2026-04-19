import { create } from "zustand";

import { FLOW_MAP } from "../data/questionFlows";
import {
  buildConsultationResult,
  buildFallbackResult,
  getNode,
  getSessionCompatibility,
  resolveNextNodeId,
  reconcileSession
} from "../lib/engine";
import {
  detectCloudAuthProvider,
  ensureCloudUser,
  isSupabaseConfigured,
  loadCloudState,
  saveCloudState,
  signInWithEmailOtp,
  signInWithKakaoOAuth,
  signOutCloudAuth,
  upsertCloudProfile,
  type CloudAuthProvider
} from "../lib/supabase";
import { createShareRecord, isShareExpired } from "../lib/share";
import {
  clearPersistedState,
  loadPersistedState,
  savePersistedState,
  type PersistedAppState
} from "../lib/storage";
import type {
  ConsultationMode,
  ConsultationResult,
  ConsultationSession,
  NetworkStatus,
  ShareRecord,
  TopicId,
  UserProfile
} from "../types";

const LOCAL_USER_ID = "local-prototype-user";

type CloudSyncStatus = "disabled" | "ready" | "syncing" | "error";

export const EMPTY_PROFILE: UserProfile = {
  nickname: "",
  birthDate: "",
  birthCalendar: "solar",
  birthTime: "",
  birthTimeUnknown: true,
  gender: "other"
};

function now() {
  return new Date().toISOString();
}

function createSession(
  profile: UserProfile,
  topicId: TopicId,
  consultMode: ConsultationMode,
  userId: string
): ConsultationSession {
  const flow = FLOW_MAP[topicId];
  const timestamp = now();

  return {
    id: `session-${crypto.randomUUID()}`,
    userId,
    profileSnapshot: profile,
    topicId,
    consultMode,
    flowVersion: flow.version,
    status: "draft",
    currentNodeId: flow.startNodeId,
    responses: [],
    compatibility: "ok",
    startedAt: timestamp,
    updatedAt: timestamp,
    saved: false
  };
}

interface AppState {
  acceptedNotice: boolean;
  profile: UserProfile;
  consultMode: ConsultationMode;
  cloudUserId: string | null;
  cloudUserEmail: string | null;
  cloudAuthProvider: CloudAuthProvider | null;
  cloudSyncStatus: CloudSyncStatus;
  networkStatus: NetworkStatus;
  activeSessionId: string | null;
  sessions: ConsultationSession[];
  results: ConsultationResult[];
  shares: ShareRecord[];
  dismissedBannerIds: string[];
  lastError?: string;
  setAcceptedNotice: (value: boolean) => void;
  updateProfile: (profile: UserProfile) => void;
  setConsultMode: (mode: ConsultationMode) => void;
  initializeCloud: () => Promise<void>;
  syncCloudState: () => Promise<void>;
  signInEmail: (email: string) => Promise<boolean>;
  signInKakao: () => Promise<boolean>;
  signOutCloud: () => Promise<void>;
  setNetworkStatus: (status: NetworkStatus) => void;
  clearError: () => void;
  dismissBanner: (id: string) => void;
  startSession: (
    topicId: TopicId,
    forceRestart?: boolean,
    mode?: ConsultationMode
  ) => ConsultationSession;
  resumeSession: (sessionId: string) => void;
  submitAnswer: (sessionId: string, nodeId: string, optionId: string) => ConsultationSession | null;
  goBack: (sessionId: string) => ConsultationSession | null;
  rewindToNode: (sessionId: string, nodeId: string) => ConsultationSession | null;
  markLoading: (sessionId: string) => void;
  generateResult: (sessionId: string) => ConsultationResult | null;
  saveSession: (sessionId: string) => void;
  createShare: (sessionId: string) => ShareRecord | null;
  disableShare: (token: string) => void;
  deleteAllData: () => void;
}

function toPersistedState(state: AppState): PersistedAppState {
  return {
    acceptedNotice: state.acceptedNotice,
    consultMode: state.consultMode,
    profile: state.profile,
    sessions: state.sessions,
    results: state.results,
    shares: state.shares,
    dismissedBannerIds: state.dismissedBannerIds
  };
}

const persisted = loadPersistedState();
const initialSessions: ConsultationSession[] = (persisted.sessions ?? []).map((session) => reconcileSession(session));
const initialResults: ConsultationResult[] = persisted.results ?? [];
const initialShares: ShareRecord[] = (persisted.shares ?? []).map((share) => {
  if (isShareExpired(share)) {
    return {
      ...share,
      status: share.status === "disabled" ? "disabled" : "expired"
    };
  }

  return share;
});

export const useAppStore = create<AppState>((set, get) => {
  const syncCloudSnapshot = (snapshot: PersistedAppState, userId: string | null) => {
    if (!isSupabaseConfigured || !userId) {
      return;
    }

    void saveCloudState(userId, snapshot).catch(() => {
      set((state) => ({
        cloudSyncStatus: "error",
        lastError: state.lastError ?? "클라우드 동기화에 실패했습니다. 잠시 후 다시 시도해 주세요."
      }));
    });
  };

  const persist = () => {
    const state = get();
    const snapshot = toPersistedState(state);
    savePersistedState(snapshot);
    syncCloudSnapshot(snapshot, state.cloudUserId);
  };

  return {
    acceptedNotice: persisted.acceptedNotice ?? false,
    profile: persisted.profile ?? EMPTY_PROFILE,
    consultMode: persisted.consultMode ?? "quick",
    cloudUserId: null,
    cloudUserEmail: null,
    cloudAuthProvider: null,
    cloudSyncStatus: isSupabaseConfigured ? "syncing" : "disabled",
    networkStatus:
      typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "online",
    activeSessionId: initialSessions[0]?.id ?? null,
    sessions: initialSessions,
    results: initialResults,
    shares: initialShares,
    dismissedBannerIds: persisted.dismissedBannerIds ?? [],
    lastError: undefined,
    setAcceptedNotice: (value) => {
      set({ acceptedNotice: value });
      persist();
    },
    updateProfile: (profile) => {
      set({ profile, lastError: undefined });
      const state = get();
      if (state.cloudUserId) {
        void upsertCloudProfile(state.cloudUserId, profile).catch(() => {
          set({ cloudSyncStatus: "error" });
        });
      }
      persist();
    },
    setConsultMode: (consultMode) => {
      set({ consultMode, lastError: undefined });
      persist();
    },
    initializeCloud: async () => {
      if (!isSupabaseConfigured) {
        set({
          cloudSyncStatus: "disabled",
          cloudUserId: null,
          cloudUserEmail: null,
          cloudAuthProvider: null
        });
        return;
      }

      try {
        set({ cloudSyncStatus: "syncing" });
        const user = await ensureCloudUser();
        const authProvider = detectCloudAuthProvider(user);

        if (!user) {
          set({
            cloudSyncStatus: "error",
            cloudUserId: null,
            cloudUserEmail: null,
            cloudAuthProvider: null,
            lastError: "Supabase 인증 세션을 만들지 못했습니다. 설정을 확인해 주세요."
          });
          return;
        }

        const remote = await loadCloudState(user.id);
        set({
          cloudUserId: user.id,
          cloudUserEmail: user.email ?? null,
          cloudAuthProvider: authProvider
        });

        if (remote) {
          const sessions = (remote.sessions ?? []).map((session) => reconcileSession(session));
          const shares: ShareRecord[] = (remote.shares ?? []).map((share) => {
            if (isShareExpired(share)) {
              return {
                ...share,
                status: (share.status === "disabled" ? "disabled" : "expired") as ShareRecord["status"]
              };
            }
            return share;
          });

          set({
            acceptedNotice: remote.acceptedNotice ?? false,
            consultMode: remote.consultMode ?? "quick",
            profile: remote.profile ?? EMPTY_PROFILE,
            sessions,
            results: remote.results ?? [],
            shares,
            dismissedBannerIds: remote.dismissedBannerIds ?? [],
            activeSessionId: sessions[0]?.id ?? null,
            cloudSyncStatus: "ready",
            lastError: undefined
          });
          savePersistedState(toPersistedState(get()));
          return;
        }

        await upsertCloudProfile(user.id, get().profile);
        const snapshot = toPersistedState(get());
        await saveCloudState(user.id, snapshot);
        set({ cloudSyncStatus: "ready", lastError: undefined });
      } catch {
        set({
          cloudSyncStatus: "error",
          lastError: "Supabase 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
        });
      }
    },
    syncCloudState: async () => {
      const state = get();
      if (!state.cloudUserId || !isSupabaseConfigured) {
        return;
      }

      try {
        set({ cloudSyncStatus: "syncing" });
        await saveCloudState(state.cloudUserId, toPersistedState(state));
        set({ cloudSyncStatus: "ready" });
      } catch {
        set({
          cloudSyncStatus: "error",
          lastError: "동기화에 실패했습니다. 네트워크 또는 Supabase 정책을 확인해 주세요."
        });
      }
    },
    signInEmail: async (email) => {
      if (!isSupabaseConfigured) {
        set({ lastError: "Supabase 환경 변수가 설정되지 않았습니다." });
        return false;
      }

      const ok = await signInWithEmailOtp(email);
      if (!ok) {
        set({ lastError: "이메일 로그인 요청을 전송하지 못했습니다." });
      }
      return ok;
    },
    signInKakao: async () => {
      if (!isSupabaseConfigured) {
        set({ lastError: "Supabase 환경 변수가 설정되지 않았습니다." });
        return false;
      }

      const ok = await signInWithKakaoOAuth();
      if (!ok) {
        set({ lastError: "카카오 로그인 요청을 시작하지 못했습니다." });
      }
      return ok;
    },
    signOutCloud: async () => {
      await signOutCloudAuth();
      set({
        cloudUserId: null,
        cloudUserEmail: null,
        cloudAuthProvider: null,
        cloudSyncStatus: isSupabaseConfigured ? "syncing" : "disabled"
      });
    },
    setNetworkStatus: (status) => {
      set({ networkStatus: status });
    },
    clearError: () => {
      set({ lastError: undefined });
    },
    dismissBanner: (id) => {
      set((state) => ({
        dismissedBannerIds: state.dismissedBannerIds.includes(id)
          ? state.dismissedBannerIds
          : [...state.dismissedBannerIds, id]
      }));
      persist();
    },
    startSession: (topicId, forceRestart = false, mode) => {
      const state = get();
      const selectedMode = mode ?? state.consultMode;
      const reusable = !forceRestart
        ? [...state.sessions]
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .find(
              (session) =>
                session.topicId === topicId &&
                session.consultMode === selectedMode &&
                ["draft", "review", "loading"].includes(session.status) &&
                session.compatibility !== "outdated"
            )
        : undefined;

      if (reusable) {
        set({ activeSessionId: reusable.id, lastError: undefined });
        return reusable;
      }

      const session = createSession(
        state.profile,
        topicId,
        selectedMode,
        state.cloudUserId ?? LOCAL_USER_ID
      );
      set((current) => ({
        sessions: [session, ...current.sessions],
        activeSessionId: session.id,
        lastError: undefined
      }));
      persist();
      return session;
    },
    resumeSession: (sessionId) => {
      set({ activeSessionId: sessionId, lastError: undefined });
    },
    submitAnswer: (sessionId, nodeId, optionId) => {
      const state = get();
      const target = state.sessions.find((session) => session.id === sessionId);

      if (!target) {
        set({ lastError: "세션을 찾을 수 없습니다." });
        return null;
      }

      const flow = FLOW_MAP[target.topicId];
      const node = getNode(flow, nodeId);
      const option = node?.options.find((candidate) => candidate.id === optionId);

      if (!node || !option) {
        set({ lastError: "질문 또는 선택지를 찾을 수 없습니다." });
        return null;
      }

      const replaceIndex = target.responses.findIndex((response) => response.nodeId === nodeId);
      const keptResponses = replaceIndex >= 0 ? target.responses.slice(0, replaceIndex) : target.responses;
      const response = {
        nodeId,
        optionId,
        label: option.label,
        tags: [...(node.resultTags ?? []), ...option.tags],
        answeredAt: now()
      };
      const provisional = {
        ...target,
        responses: [...keptResponses, response]
      };
      const nextNodeId = resolveNextNodeId(provisional, node, optionId);
      const updated: ConsultationSession = {
        ...provisional,
        flowVersion: flow.version,
        compatibility: "ok",
        currentNodeId: nextNodeId,
        status: nextNodeId ? "draft" : "review",
        updatedAt: now()
      };

      set((current) => ({
        sessions: current.sessions.map((session) => (session.id === sessionId ? updated : session)),
        activeSessionId: sessionId,
        lastError: undefined
      }));
      persist();
      return updated;
    },
    goBack: (sessionId) => {
      const state = get();
      const target = state.sessions.find((session) => session.id === sessionId);

      if (!target) {
        set({ lastError: "세션을 찾을 수 없습니다." });
        return null;
      }

      const flow = FLOW_MAP[target.topicId];

      if (target.responses.length === 0) {
        return target;
      }

      const previousNodeId =
        target.responses.length === 1 ? flow.startNodeId : target.responses[target.responses.length - 1].nodeId;
      const updated: ConsultationSession = {
        ...target,
        responses: target.responses.slice(0, -1),
        currentNodeId: previousNodeId,
        status: "draft",
        updatedAt: now()
      };

      set((current) => ({
        sessions: current.sessions.map((session) => (session.id === sessionId ? updated : session)),
        lastError: undefined
      }));
      persist();
      return updated;
    },
    rewindToNode: (sessionId, nodeId) => {
      const state = get();
      const target = state.sessions.find((session) => session.id === sessionId);

      if (!target) {
        set({ lastError: "세션을 찾을 수 없습니다." });
        return null;
      }

      const responseIndex = target.responses.findIndex((response) => response.nodeId === nodeId);
      const updated: ConsultationSession = {
        ...target,
        responses: responseIndex >= 0 ? target.responses.slice(0, responseIndex) : target.responses,
        currentNodeId: nodeId,
        status: "draft",
        updatedAt: now()
      };

      set((current) => ({
        sessions: current.sessions.map((session) => (session.id === sessionId ? updated : session)),
        activeSessionId: sessionId,
        lastError: undefined
      }));
      persist();
      return updated;
    },
    markLoading: (sessionId) => {
      set((state) => ({
        sessions: state.sessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                status: "loading",
                updatedAt: now()
              }
            : session
        )
      }));
      persist();
    },
    generateResult: (sessionId) => {
      const state = get();
      const target = state.sessions.find((session) => session.id === sessionId);

      if (!target) {
        set({ lastError: "세션을 찾을 수 없습니다." });
        return null;
      }

      let result: ConsultationResult;

      try {
        const compatibility = getSessionCompatibility(target);
        const normalized = compatibility === "ok" ? target : { ...target, compatibility };
        const generationSource =
          isSupabaseConfigured && Boolean(state.cloudUserId) && state.networkStatus === "online"
            ? "cloud"
            : "local";
        result = buildConsultationResult(normalized, generationSource);
      } catch {
        result = buildFallbackResult(target);
      }

      const updatedSession: ConsultationSession = {
        ...target,
        status: "result",
        currentNodeId: null,
        compatibility: getSessionCompatibility(target),
        resultId: result.id,
        completedAt: result.generatedAt,
        updatedAt: result.generatedAt
      };

      set((current) => ({
        results: [result, ...current.results.filter((entry) => entry.id !== result.id)],
        sessions: current.sessions.map((session) => (session.id === sessionId ? updatedSession : session)),
        activeSessionId: sessionId,
        lastError: undefined
      }));
      persist();
      return result;
    },
    saveSession: (sessionId) => {
      set((state) => ({
        sessions: state.sessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                saved: true,
                updatedAt: now()
              }
            : session
        )
      }));
      persist();
    },
    createShare: (sessionId) => {
      const state = get();
      const session = state.sessions.find((candidate) => candidate.id === sessionId);

      if (!session?.resultId) {
        set({ lastError: "공유할 결과를 먼저 생성해 주세요." });
        return null;
      }

      const existing = state.shares.find(
        (share) => share.resultId === session.resultId && !isShareExpired(share)
      );

      if (existing) {
        return existing;
      }

      const share = createShareRecord(session.userId, session.id, session.resultId);
      set((current) => ({
        shares: [share, ...current.shares],
        sessions: current.sessions.map((entry) =>
          entry.id === sessionId
            ? {
                ...entry,
                shareToken: share.token,
                updatedAt: now()
              }
            : entry
        ),
        lastError: undefined
      }));
      persist();
      return share;
    },
    disableShare: (token) => {
      set((state) => ({
        shares: state.shares.map((share) =>
          share.token === token
            ? {
                ...share,
                status: "disabled"
              }
            : share
        )
      }));
      persist();
    },
    deleteAllData: () => {
      clearPersistedState();
      set({
        acceptedNotice: false,
        profile: EMPTY_PROFILE,
        consultMode: "quick",
        cloudUserId: get().cloudUserId,
        cloudUserEmail: get().cloudUserEmail,
        cloudAuthProvider: get().cloudAuthProvider,
        cloudSyncStatus: get().cloudUserId ? "ready" : isSupabaseConfigured ? "syncing" : "disabled",
        networkStatus:
          typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "online",
        activeSessionId: null,
        sessions: [],
        results: [],
        shares: [],
        dismissedBannerIds: [],
        lastError: undefined
      });
      persist();
    }
  };
});
