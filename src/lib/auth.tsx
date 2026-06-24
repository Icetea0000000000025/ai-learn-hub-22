import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

export type Profile = {
  id: string;
  name: string | null;
  email?: string | null;
  role: "student" | "creator" | "admin";
  avatar_url: string | null;
  has_selected_role?: boolean;
  org_request_status?: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, role: "student" | "creator") => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profileResult, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    let data = profileResult;

    if (error) {
      console.error("Error fetching profile:", error);
    } else if (!data) {
      // FALLBACK: If trigger failed or is delayed, create profile manually
      console.warn("Profile not found for user, attempting manual creation...");
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            name:
              userData.user.user_metadata?.name || split_part(userData.user.email || "", "@", 0),
            email: userData.user.email,
            role: userData.user.user_metadata?.role || "student",
            status: "active",
            has_selected_role: !!userData.user.user_metadata?.role,
          })
          .select()
          .maybeSingle();

        if (createError) {
          console.error("Manual profile creation failed:", createError);
        } else {
          data = newProfile;
        }
      }
    }

    if (data) {
      // FIX: Ensure role is never null for the UI
      const profileData = data as any as Profile;
      if (!profileData.role) {
        profileData.role = "student";
      }
      setProfile(profileData);
    }
    setLoading(false);
  }, []);

  function split_part(str: string, sep: string, index: number) {
    return str.split(sep)[index] || "";
  }

  useEffect(() => {
    // Get initial session
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const value = {
    session,
    user,
    profile,
    loading,
    signIn: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    signInWithGoogle: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    },
    signUp: async (email: string, password: string, role: "student" | "creator" = "student") => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
          },
        },
      });
      if (error) throw error;
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      queryClient.clear();
      window.location.href = "/login";
    },
    resetPassword: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
    },
    updateProfile: async (updates: Partial<Profile>) => {
      if (!user) throw new Error("No user session");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates as any)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      if (data) setProfile(data as any as Profile);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export async function getCurrentSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return session;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    return {
      access_token: "",
      expires_in: 0,
      refresh_token: "",
      user,
    } as Session;
  }
  return null;
}
