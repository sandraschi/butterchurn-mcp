import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CapabilitiesProvider } from "./lib/capabilities";
import { PresetsProvider } from "./lib/PresetsContext";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("butterchurn-mcp webapp: missing #root element");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <CapabilitiesProvider>
      <PresetsProvider>
        <App />
      </PresetsProvider>
    </CapabilitiesProvider>
  </React.StrictMode>,
);
