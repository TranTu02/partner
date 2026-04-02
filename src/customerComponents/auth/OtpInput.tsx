import { useState, useRef, useCallback, useEffect } from "react";

interface OtpInputProps {
    length?: number;
    onComplete: (code: string) => void;
    disabled?: boolean;
}

export function OtpInput({ length = 8, onComplete, disabled = false }: OtpInputProps) {
    const [values, setValues] = useState<string[]>(Array(length).fill(""));
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Auto-focus first input on mount
        inputsRef.current[0]?.focus();
    }, []);

    const triggerComplete = useCallback(
        (newValues: string[]) => {
            const code = newValues.join("");
            if (code.length === length && /^\d+$/.test(code)) {
                onComplete(code);
            }
        },
        [length, onComplete],
    );

    const handleChange = (index: number, value: string) => {
        // Only allow digits
        const digit = value.replace(/\D/g, "").slice(-1);
        const newValues = [...values];
        newValues[index] = digit;
        setValues(newValues);

        if (digit && index < length - 1) {
            inputsRef.current[index + 1]?.focus();
        }

        triggerComplete(newValues);
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
            if (!values[index] && index > 0) {
                const newValues = [...values];
                newValues[index - 1] = "";
                setValues(newValues);
                inputsRef.current[index - 1]?.focus();
            } else {
                const newValues = [...values];
                newValues[index] = "";
                setValues(newValues);
            }
        } else if (e.key === "ArrowLeft" && index > 0) {
            inputsRef.current[index - 1]?.focus();
        } else if (e.key === "ArrowRight" && index < length - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
        if (!pastedData) return;

        const newValues = [...values];
        for (let i = 0; i < pastedData.length; i++) {
            newValues[i] = pastedData[i];
        }
        setValues(newValues);

        // Focus on the next empty cell or the last filled cell
        const nextIndex = Math.min(pastedData.length, length - 1);
        inputsRef.current[nextIndex]?.focus();

        triggerComplete(newValues);
    };

    return (
        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {values.map((val, i) => (
                <input
                    key={i}
                    ref={(el) => { inputsRef.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={disabled}
                    className={`
                        w-11 h-14 text-center text-xl font-bold rounded-lg border-2 
                        transition-all duration-200 outline-none
                        ${val ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card text-foreground"}
                        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"}
                    `}
                    autoComplete="one-time-code"
                />
            ))}
        </div>
    );
}
