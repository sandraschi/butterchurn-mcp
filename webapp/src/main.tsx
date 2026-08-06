import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CapabilitiesProvider } from "./lib/capabilities";
import { PresetsProvider } from "./lib/PresetsContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CapabilitiesProvider>
      <PresetsProvider>
        <App />
      </PresetsProvider>
    </CapabilitiesProvider>
  </React.StrictMode>,
);
