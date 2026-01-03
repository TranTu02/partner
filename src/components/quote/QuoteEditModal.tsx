import { QuoteEditor } from "./QuoteEditor";
import { useEffect } from "react";

interface QuoteEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: "view" | "edit" | "create";
    initialData?: any;
    onSaveSuccess?: () => void;
}

export function QuoteEditModal({ isOpen, onClose, mode, initialData, onSaveSuccess }: QuoteEditModalProps) {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background animate-in fade-in duration-200">
            {/* We render QuoteEditor directly as a full-screen overlay */}
            <QuoteEditor mode={mode} initialData={initialData} onBack={onClose} onSaveSuccess={onSaveSuccess} />
        </div>
    );
}
