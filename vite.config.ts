import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    assetsInclude: ["**/*.png", "**/*.jpg", "**/*.svg", "**/*.otf", "**/*.ttf"], // file ảnh, font
    define: {
        __WS_TOKEN__: JSON.stringify("abc"),
        global: "globalThis", // Định nghĩa `global` thành `globalThis`
    },
    optimizeDeps: {
        include: ["html2pdf.js", "jspdf", "html2canvas"],
        esbuildOptions: {
            target: "esnext",
        },
    },
    build: {
        chunkSizeWarningLimit: 1500,
        commonjsOptions: {
            include: [/html2pdf/, /jspdf/, /html2canvas/, /node_modules/],
            transformMixedEsModules: true,
        },
        // Let Vite handle chunking automatically to ensure proper dependency order
    },
    server: {
        host: true,
        allowedHosts: [".irdop.org"],
    },
    preview: {
        host: true, // or '0.0.0.0' for all interfaces
        port: 4173,
        allowedHosts: [".irdop.org"],
    },
});
