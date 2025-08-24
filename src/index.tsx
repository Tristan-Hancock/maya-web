import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Amplify } from "aws-amplify";
import awsconfig from "./aws-exports";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

Amplify.configure(awsconfig);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Authenticator>
  {({ signOut, user }) => (
    <>
      <div className="absolute top-2 left-2 text-sm text-gray-700">
        Hello, {user?.username || user?.signInDetails?.loginId}
      </div>
      <button
        onClick={signOut}
        className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white rounded"
      >
        Sign out
      </button>
      <App />
    </>
  )}
</Authenticator>

  </React.StrictMode>
);
