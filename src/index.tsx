import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Amplify } from "aws-amplify";
import awsconfig from "./aws-exports";
import "@aws-amplify/ui-react/styles.css";
import { AuthProvider } from "./auth/AuthContext";
import AuthGate from "./AuthGate";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./appContext";
Amplify.configure(awsconfig);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
  <BrowserRouter>
  <AppProvider>

    <AuthProvider>
      <AuthGate>
        
        <App />
      </AuthGate>

    </AuthProvider>
    </AppProvider>

    </BrowserRouter>
  </React.StrictMode>
);
