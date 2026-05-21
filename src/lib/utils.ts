import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.round(amount));
}

export function formatDate(date: string | number | Date | null | undefined): string {
    if (!date) return "--";

    if (date instanceof Date) {
        if (isNaN(date.getTime())) return "Invalid Date";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    if (typeof date === "number") {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
            const day = String(parsedDate.getDate()).padStart(2, "0");
            const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
            const year = parsedDate.getFullYear();
            return `${day}/${month}/${year}`;
        }
        return "Invalid Date";
    }

    if (typeof date === "string") {
        let trimmed = date.trim();
        // Remove surrounding quotes if they exist (e.g. '"2026-04-18T..."')
        trimmed = trimmed.replace(/^"|"$/g, "");
        // If it's already in DD/MM/YYYY format, return as is
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
            return trimmed;
        }

        // Try standard new Date()
        let parsedDate = new Date(trimmed);
        
        // If invalid, check if it's numeric timestamp in string form
        if (isNaN(parsedDate.getTime()) && /^\d+$/.test(trimmed)) {
            parsedDate = new Date(parseInt(trimmed));
        }

        // If invalid, try replacing space with 'T' for ISO format compatibility (e.g. PostgreSQL timestamps "YYYY-MM-DD HH:mm:ss")
        if (isNaN(parsedDate.getTime())) {
            const isoString = trimmed.replace(" ", "T");
            parsedDate = new Date(isoString);
        }

        // If invalid, try parsing YYYY-MM-DD manually
        if (isNaN(parsedDate.getTime())) {
            const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                const [, year, month, day] = match;
                parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
        }

        if (!isNaN(parsedDate.getTime())) {
            const day = String(parsedDate.getDate()).padStart(2, "0");
            const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
            const year = parsedDate.getFullYear();
            return `${day}/${month}/${year}`;
        }
    }

    return "Invalid Date";
}

