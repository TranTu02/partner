import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

type DatePickerInputProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

function maskYmd(raw: string) {
  const d = digitsOnly(raw).slice(0, 8);
  const y = d.slice(0, 4);
  const m = d.slice(4, 6);
  const day = d.slice(6, 8);

  if (d.length <= 4) return y;
  if (d.length <= 6) return `${y}-${m}`;
  return `${y}-${m}-${day}`;
}

function parseYmd(text: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  const dt = parse(text, "yyyy-MM-dd", new Date());
  return isValid(dt) ? dt : undefined;
}

export function DateInput({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  disabled,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(value ?? "");
  const [touched, setTouched] = React.useState(false);
  const { t } = useTranslation();

  React.useEffect(() => {
    setText(value ?? "");
  }, [value]);

  const selectedDate = React.useMemo(() => parseYmd(text), [text]);
  const isComplete = text.length === 10;
  const isValidComplete = !!selectedDate;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextMasked = maskYmd(e.target.value);
    setText(nextMasked);

    const dt = parseYmd(nextMasked);
    if (dt) onChange(format(dt, "yyyy-MM-dd"));
    if (!nextMasked) onChange("");
  };

  const commit = () => {
    setTouched(true);

    if (!text.trim()) {
      onChange("");
      return;
    }

    const dt = parseYmd(text);
    if (!dt) return;
    onChange(format(dt, "yyyy-MM-dd"));
  };

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 space-y-1">
        <Input
          value={text}
          onChange={handleChange}
          onBlur={commit}
          placeholder={placeholder}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="off"
          className="h-9 border border-border bg-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />

        {touched && text && isComplete && !isValidComplete && (
          <div className="text-xs text-destructive">
            {t("dashboardLogs.invalidDate")}
          </div>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            className="shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-2" align="start" sideOffset={6}>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => {
              if (!d) return;
              const next = format(d, "yyyy-MM-dd");
              setText(next);
              onChange(next);
              setTouched(true);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
