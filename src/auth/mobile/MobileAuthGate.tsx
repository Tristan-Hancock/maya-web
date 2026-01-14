import { useState } from "react";
import MobileLanding from "./MobileLanding";
import MobileAuthShell from "./MobileAuthShell";

import SignInForm from "../SignInForm";
import SignUpForm from "../SignUpForm";
import ForgotPasswordForm from "../ForgotPasswordForm";
import ConfirmSignUpForm from "../ConfirmSignUpForm";

type MobileRoute =
  | "landing"
  | "signIn"
  | "signUp"
  | "forgotPassword"
  | "confirmSignUp";

export default function MobileAuthGate() {
  const [route, setRoute] = useState<MobileRoute>("landing");

  if (route === "landing") {
    return <MobileLanding onContinue={() => setRoute("signIn")} />;
  }

  return (
    <MobileAuthShell onBack={() => setRoute("landing")}>
      {route === "signIn" && <SignInForm />}
      {route === "signUp" && <SignUpForm />}
      {route === "forgotPassword" && <ForgotPasswordForm />}
      {route === "confirmSignUp" && <ConfirmSignUpForm />}
    </MobileAuthShell>
  );
}
