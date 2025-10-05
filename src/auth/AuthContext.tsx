// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  signIn,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  signOut as amplifySignOut,
  fetchAuthSession,
} from "aws-amplify/auth";

type Route = "signIn" | "signUp" | "confirmSignUp" | "forgotPassword" | "app";

type AuthContextValue = {
  route: Route;
  setRoute: (r: Route) => void;
  user: { username?: string | null } | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;

  // new stable display fields
  displayLabel: string;   // email if present, otherwise a readable fallback
  displayInitial: string; // first letter of displayLabel or "U"

  doSignIn: (username: string, password: string) => Promise<void>;
  doSignUp: (email: string, password: string) => Promise<void>;
  doConfirmSignUp: (email: string, code: string) => Promise<void>;
  doResendCode: (email: string) => Promise<void>;
  startResetPassword: (email: string) => Promise<void>;
  finishResetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  doSignOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<Route>("signIn");
  const [user, setUser] = useState<{ username?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<string | null>(null);

  // stable display identity
  const [displayLabel, setDisplayLabel] = useState<string>("");
  const [displayInitial, setDisplayInitial] = useState<string>("U");

  const clearError = () => setErr(null);

  // compute and set display identity from tokens and current user
  const hydrateDisplayIdentity = useCallback(
    async (fallbackUsername?: string | null) => {
      try {
        const session = await fetchAuthSession();
        const payload = (session.tokens?.idToken?.payload ?? {}) as Record<string, any>;

        const email =
          (payload["email"] as string | undefined) ??
          (payload["custom:email"] as string | undefined);

        const preferred =
          (payload["preferred_username"] as string | undefined) ??
          (payload["name"] as string | undefined);

        const cognitoUsername =
          (payload["cognito:username"] as string | undefined) ??
          fallbackUsername ??
          "User";

        const label = email || preferred || cognitoUsername;
        const initial = (label?.[0] || "U").toUpperCase();

        setDisplayLabel(label);
        setDisplayInitial(initial);
      } catch {
        const label = fallbackUsername || "User";
        setDisplayLabel(label);
        setDisplayInitial((label[0] || "U").toUpperCase());
      }
    },
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const current = await getCurrentUser();
        setUser({ username: current?.username });
        await hydrateDisplayIdentity(current?.username);
        setRoute("app");
      } catch {
        setUser(null);
        setDisplayLabel("");
        setDisplayInitial("U");
        setRoute("signIn");
      } finally {
        setLoading(false);
      }
    })();
  }, [hydrateDisplayIdentity]);

  const doSignIn = useCallback(async (username: string, password: string) => {
    setErr(null);
    try {
      await signIn({ username, password });
      setUser({ username });
      await hydrateDisplayIdentity(username); // refresh display identity after login
      setRoute("app");
    } catch (e: any) {
      if (e?.name === "UserNotConfirmedException" || e?.name === "UserUnconfirmedException") {
        setRoute("confirmSignUp");
      } else {
        setErr(e?.message || "Sign in failed");
      }
      throw e;
    }
  }, [hydrateDisplayIdentity]);

  const doSignUp = useCallback(async (email: string, password: string) => {
    setErr(null);
    try {
      await signUp({ username: email, password, options: { userAttributes: { email } } });
      setRoute("confirmSignUp");
    } catch (e: any) {
      setErr(e?.message || "Sign up failed");
      throw e;
    }
  }, []);

  const doConfirmSignUp = useCallback(async (email: string, code: string) => {
    setErr(null);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      setRoute("signIn");
    } catch (e: any) {
      setErr(e?.message || "Confirmation failed");
      throw e;
    }
  }, []);

  const doResendCode = useCallback(async (email: string) => {
    setErr(null);
    try {
      await resendSignUpCode({ username: email });
    } catch (e: any) {
      setErr(e?.message || "Could not resend code");
      throw e;
    }
  }, []);

  const startResetPassword = useCallback(async (email: string) => {
    setErr(null);
    try {
      await resetPassword({ username: email });
      setRoute("forgotPassword");
    } catch (e: any) {
      setErr(e?.message || "Reset failed to start");
      throw e;
    }
  }, []);

  const finishResetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    setErr(null);
    try {
      await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
      setRoute("signIn");
    } catch (e: any) {
      setErr(e?.message || "Reset confirmation failed");
      throw e;
    }
  }, []);

  const doSignOut = useCallback(async () => {
    setErr(null);
    try {
      await amplifySignOut();
      setUser(null);
      setDisplayLabel("");
      setDisplayInitial("U");
      setRoute("signIn");
    } catch (e: any) {
      setErr(e?.message || "Sign out failed");
      throw e;
    }
  }, []);

  const value: AuthContextValue = {
    route,
    setRoute,
    user,
    loading,
    error: error,
    clearError,

    displayLabel,
    displayInitial,

    doSignIn,
    doSignUp,
    doConfirmSignUp,
    doResendCode,
    startResetPassword,
    finishResetPassword,
    doSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
