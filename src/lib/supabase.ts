import { createClient } from "@supabase/supabase-js";

import type { UserProfile } from "../types";
import type { PersistedAppState } from "./storage";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : undefined;

export async function ensureCloudUser() {
  if (!supabase) {
    return null;
  }

  const sessionResult = await supabase.auth.getSession();
  const existing = sessionResult.data.session?.user ?? null;
  if (existing) {
    return existing;
  }

  const anonymous = await supabase.auth.signInAnonymously();
  if (anonymous.error || !anonymous.data.user) {
    return null;
  }

  return anonymous.data.user;
}

export async function signInWithEmailOtp(email: string) {
  if (!supabase) {
    return false;
  }

  const response = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window === "undefined" ? undefined : window.location.origin
    }
  });

  return !response.error;
}

export async function signOutCloudAuth() {
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}

export async function loadCloudState(userId: string): Promise<PersistedAppState | null> {
  if (!supabase) {
    return null;
  }

  const response = await supabase
    .from("app_user_state")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle<{ state: PersistedAppState }>();

  if (response.error || !response.data) {
    return null;
  }

  return response.data.state;
}

export async function saveCloudState(userId: string, state: PersistedAppState) {
  if (!supabase) {
    return;
  }

  await supabase.from("app_user_state").upsert(
    {
      user_id: userId,
      state,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );
}

export async function upsertCloudProfile(userId: string, profile: UserProfile) {
  if (!supabase) {
    return;
  }

  await supabase.from("profiles").upsert(
    {
      id: userId,
      nickname: profile.nickname || null,
      birth_date: profile.birthDate || null,
      birth_calendar: profile.birthCalendar,
      birth_time: profile.birthTimeUnknown ? null : profile.birthTime || null,
      birth_time_unknown: profile.birthTimeUnknown,
      gender: profile.gender,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );
}
