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
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules")) {
                        if (id.includes("tinymce")) return "tinymce";
                        if (id.includes("recharts")) return "recharts";
                        if (id.includes("html2pdf") || id.includes("jspdf")) return "pdf";
                        if (id.includes("react-dnd")) return "dnd";
                        if (id.includes("@radix-ui") || id.includes("lucide-react")) return "ui";
                        if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) return "react-vendor";
                        // Organize other large libs if necessary, otherwise default vendor
                        return "vendor";
                    }
                },
            },
        },
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
