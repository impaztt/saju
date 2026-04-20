import type {
  ConsultationMode,
  ConsultationResult,
  ConsultationSession,
  ShareRecord,
  UserProfile
} from "../types";

const STORAGE_KEY = "interactive-saju-app/v1";

export interface PersistedAppState {
  acceptedNotice: boolean;
  consultMode: ConsultationMode;
  profile: UserProfile;
  sessions: ConsultationSession[];
  results: ConsultationResult[];
  shares: ShareRecord[];
  dismissedBannerIds: string[];
}

export function loadPersistedState(): Partial<PersistedAppState> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as PersistedAppState;
  } catch {
    return {};
  }
}

export function savePersistedState(state: PersistedAppState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write errors (quota/private mode) and continue in-memory.
  }
}

export function clearPersistedState() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage clear errors.
  }
}
