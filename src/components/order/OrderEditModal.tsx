import { OrderEditor } from "./OrderEditor";
import { useEffect } from "react";

interface OrderEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: "view" | "edit" | "create";
    initialData?: any;
    onSaveSuccess?: () => void;
}

export function OrderEditModal({ isOpen, onClose, mode, initialData, onSaveSuccess }: OrderEditModalProps) {
    // ... (useEffect logic)
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
            <OrderEditor mode={mode} initialData={initialData} onBack={onClose} onSaveSuccess={onSaveSuccess} />
        </div>
    );
}
