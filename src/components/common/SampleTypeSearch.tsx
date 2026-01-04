import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getSampleTypes } from "@/api/index";

interface SampleType {
    sampleTypeId: string;
    sampleTypeName: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

interface SampleTypeSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string; // To allow passing wrapper styles
}

export function SampleTypeSearch({ value, onChange, placeholder, disabled, className }: SampleTypeSearchProps) {
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState<SampleType[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync input value with prop value (e.g. initial load or external update)
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchSuggestions = async (query: string) => {
        if (!query) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        try {
            // Use standard list endpoint with search param
            const response = await getSampleTypes({ query: { search: query, itemsPerPage: 10 } });
            if (response.success && response.data) {
                setSuggestions(response.data as SampleType[]);
            } else {
                setSuggestions([]);
            }
        } catch (error) {
            console.error(error);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue); // Update parent immediately as text input

        if (newValue.length > 1) {
            // Only search if length > 1
            setShowSuggestions(true);
            const timer = setTimeout(() => {
                fetchSuggestions(newValue);
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSelect = (item: SampleType) => {
        // "gán giá trị sampleTypeName vào ô input nếu select giá trị trả về"
        const name = item.sampleTypeName;
        setInputValue(name);
        onChange(name);
        setShowSuggestions(false);
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (inputValue.length > 1) setShowSuggestions(true);
                    }}
                    placeholder={placeholder}
                    disabled={disabled}
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((item) => (
                        <button key={item.sampleTypeId} className="w-full text-left px-4 py-2 text-sm hover:bg-muted focus:bg-muted transition-colors flex flex-col" onClick={() => handleSelect(item)}>
                            <span className="font-medium text-foreground">{item.sampleTypeName}</span>
                            {/* Optional: Show displayTypeStyle info? User didn't explicitly ask to show it in dropdown, just use it for selection logic if needed. */}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
