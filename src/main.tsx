import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app/globals.css";
import "@/config/i18n";
import App from "./app/App.tsx";
import { ThemeProvider } from "./config/theme";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider storageKey="vite-ui-theme">
            <App />
        </ThemeProvider>
    </StrictMode>,
);
