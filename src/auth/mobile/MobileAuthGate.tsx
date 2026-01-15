import  { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

import MobileLandingContent from "./MobileLandingContent";
import MobileAuthShell from "./MobileAuthShell";

import SignInForm from "../SignInForm";
import SignUpForm from "../SignUpForm";
import ConfirmSignUpForm from "../ConfirmSignUpForm";
import ForgotPasswordForm from "../ForgotPasswordForm";

/**
 * Mobile-only auth state machine.
 * Owns which auth screen is shown inside the shared mobile frame.
 */
type MobileScreen =
  | "landing"
  | "signIn"
  | "signUp"
  | "confirmSignUp"
  | "forgotPassword";

export default function MobileAuthGate() {
  const { route } = useAuth();

  const [screen, setScreen] = useState<MobileScreen>("landing");

  /**
   * Keep MobileAuthGate in sync with AuthContext route
   * (e.g. Cognito forces confirmSignUp)
   */
  useEffect(() => {
    if (screen === "landing") return;
  
    if (route === "signIn") setScreen("signIn");
    if (route === "signUp") setScreen("signUp");
    if (route === "confirmSignUp") setScreen("confirmSignUp");
    if (route === "forgotPassword") setScreen("forgotPassword");
  }, [route, screen]);
  
  /* ------------------ BACK HANDLING ------------------ */
  const handleBack = () => {
    if (screen === "landing") return;

    if (
      screen === "signIn" ||
      screen === "signUp"
    ) {
      setScreen("landing");
      return;
    }

    // deeper flows go back to sign-in
    setScreen("signIn");
  };

  /* ------------------ CONTENT SWITCH ------------------ */
  const renderContent = () => {
    switch (screen) {
      case "landing":
        return (
          <MobileLandingContent
            onContinue={() => setScreen("signIn")}
          />
        );

      case "signIn":
        return <SignInForm variant="mobile" />;

      case "signUp":
        return <SignUpForm />;

      case "confirmSignUp":
        return <ConfirmSignUpForm />;

      case "forgotPassword":
        return <ForgotPasswordForm />;

      default:
        return null;
    }
  };

  /* ------------------ SHELL ------------------ */
  return (
    <MobileAuthShell
      onBack={handleBack}
      showBack={screen !== "landing"}
      title={
        screen === "landing"
          ? undefined
          : screen === "signUp"
          ? "Create account"
          : screen === "confirmSignUp"
          ? "Confirm email"
          : screen === "forgotPassword"
          ? "Reset password"
          : "Welcome"
      }
      subtitle={
        screen === "signIn"
          ? "Sign in to continue"
          : screen === "signUp"
          ? "Create your account"
          : undefined
      }
    >
      {renderContent()}
    </MobileAuthShell>
  );
}
