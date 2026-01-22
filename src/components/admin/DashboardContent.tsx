import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateInput } from "../common/DateInput";
import { parse, isValid, isAfter, startOfDay } from "date-fns";

type LogCommand = "CREATE" | "UPDATE" | "DELETE" | "READ";

export type LogRow = {
    id: number;
    createdAt: string;
    createdById: string;
    command: LogCommand;
    sourceTable: string;
    sourceIds: string;
    data: Record<string, any>;
    intent?: string;
};

function mockLogsFlat(): LogRow[] {
    return [
        {
            id: 20493,
            createdAt: "2026-01-13 10:27:02.999894+00",
            createdById: "IDx0dc77",
            command: "UPDATE",
            sourceTable: "lab.sample",
            sourceIds: "SPx24431008-07",
            data: { sampleName: "SAMPLE TEST 12321 31" },
            intent: "intent...",
        },
        {
            id: 20501,
            createdAt: "2026-01-13 10:40:12.111000+00",
            createdById: "USR-002",
            command: "CREATE",
            sourceTable: "crm.orders",
            sourceIds: "ORD-20260113-01",
            data: {
                clientId: "CLI-2024-001",
                totalAmount: 5400000,
                paymentStatus: "Unpaid",
            },
            intent: "Create order",
        },
        {
            id: 10101,
            createdAt: "2026-01-13 09:10:11.100000+00",
            createdById: "USR-001",
            command: "DELETE",
            sourceTable: "identity.identities",
            sourceIds: "USR-001",
            data: { alias: "System Administrator", roles: { superAdmin: true } },
            intent: "Update user roles",
        },
        {
            id: 30011,
            createdAt: "2026-01-13 11:05:00.000000+00",
            createdById: "USR-001",
            command: "READ",
            sourceTable: "library.matrices",
            sourceIds: "MAT-090",
            data: { sampleTypeId: "ST-001", parameterName: "pH", feeAfterTax: 50000 },
            intent: "Create matrix",
        },
        {
            id: 50002,
            createdAt: "2026-01-13 13:01:33.333000+00",
            createdById: "USR-002",
            command: "CREATE",
            sourceTable: "document.reports",
            sourceIds: "REP-0009",
            data: { receiptId: "TNM2501-001", sampleId: "SMP-001" },
            intent: "Generate report",
        },
        {
            id: 60001,
            createdAt: "2026-01-13 13:30:00.000000+00",
            createdById: "USR-033",
            command: "CREATE",
            sourceTable: "service.opai",
            sourceIds: "OAI-LOG-001",
            data: { role: "assistant", tokenUsage: { totalTokens: 1234 } },
            intent: "Log OpenAI message",
        },
    ];
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border", className)}>{children}</span>;
}

const commandBadgeClass = (cmd: LogCommand) => {
    switch (cmd) {
        case "CREATE":
            return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
        case "UPDATE":
            return "text-sky-500 border-sky-500/30 bg-sky-500/10";
        case "DELETE":
            return "text-red-500 border-red-500/30 bg-red-500/10";
        case "READ":
            return "text-yellow-500 border-yellow-500/30 bg-yellow-500/10";
        default:
            return "";
    }
};
function InlineJsonWithTooltip({ value }: { value: any }) {
    const pretty = JSON.stringify(value, null, 2);
    const inline = JSON.stringify(value);

    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="truncate font-mono text-md text-foreground/80">{inline}</div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[720px] p-0 text-md">
                    <pre className="p-3 font-mono max-h-[50vh] overflow-auto">{pretty}</pre>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

type ValueFilter = {
    type: "values";
    values: string[];
};

type DateRangeFilter = {
    type: "dateRange";
    from?: string;
    to?: string;
};

type ExcelFilters = {
    id?: ValueFilter;
    createdAt?: DateRangeFilter;
    createdById?: ValueFilter;
    command?: ValueFilter;
    sourceTable?: ValueFilter;
    sourceIds?: ValueFilter;
    intent?: ValueFilter;
    data?: ValueFilter; // Added 'data' to fix indexing error
};

function ExcelFilterDropdown({
    columnKey,
    rows,
    filters,
    setFilters,
    onClose,
}: {
    columnKey: keyof LogRow;
    rows: LogRow[];
    filters: ExcelFilters;
    setFilters: React.Dispatch<React.SetStateAction<ExcelFilters>>;
    onClose: () => void;
}) {
    const filter = filters[columnKey];
    const appliedValues = filter?.type === "values" ? filter.values : [];
    const [draftValues, setDraftValues] = useState<string[]>(appliedValues);
    const [search, setSearch] = useState("");

    const allValues = useMemo(() => Array.from(new Set(rows.map((r) => String(r[columnKey] ?? "")))).sort(), [rows, columnKey]);

    const visibleValues = allValues.filter((v) => v.toLowerCase().includes(search.toLowerCase()));

    const toggleValue = (val: string) => {
        setDraftValues((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));
    };

    const toggleAll = () => {
        setDraftValues(draftValues.length === allValues.length ? [] : allValues);
    };

    return (
        <div className="w-60 p-2 space-y-2 text-md">
            <Input className="h-7 text-xs" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />

            <label className="flex items-center gap-2 text-md">
                <input type="checkbox" checked={draftValues.length === allValues.length} onChange={toggleAll} />
                (Select All)
            </label>

            <div className="max-h-48 overflow-auto space-y-1">
                {visibleValues.map((v) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer text-md">
                        <input type="checkbox" checked={draftValues.includes(v)} onChange={() => toggleValue(v)} />
                        <span className="truncate">{v}</span>
                    </label>
                ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        setDraftValues(appliedValues);
                        setSearch("");
                        onClose();
                    }}
                >
                    Cancel
                </Button>
                <Button
                    size="sm"
                    onClick={() => {
                        setFilters((prev) => ({
                            ...prev,
                            [columnKey]: {
                                type: "values",
                                values: draftValues,
                            } as ValueFilter,
                        }));

                        onClose();
                    }}
                >
                    OK
                </Button>
            </div>
        </div>
    );
}

function parseYmdStrict(s: string) {
    if (!s) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
    const d = parse(s, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
}

function DateRangeFilterDropdown({ filters, setFilters, onClose }: { filters: ExcelFilters; setFilters: React.Dispatch<React.SetStateAction<ExcelFilters>>; onClose: () => void }) {
    const current = (filters.createdAt as DateRangeFilter) || {};
    const { t } = useTranslation();

    const [from, setFrom] = useState(current.from || "");
    const [to, setTo] = useState(current.to || "");
    const [touched, setTouched] = useState(false);

    const fromDate = parseYmdStrict(from);
    const toDate = parseYmdStrict(to);

    const fromOk = !from || !!fromDate;
    const toOk = !to || !!toDate;

    const rangeOk = !fromDate || !toDate ? true : !isAfter(startOfDay(fromDate), startOfDay(toDate)); // from <= to

    const canApply = fromOk && toOk && rangeOk;

    return (
        <div className="w-80 p-3 space-y-3 text-md">
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t(`dashboardLogs.from`)}</label>
                <DateInput
                    value={from}
                    onChange={(v) => {
                        setFrom(v);
                        setTouched(true);
                    }}
                />
                {touched && from && !fromOk && <div className="text-xs text-destructive">{t("dashboardLogs.invalidDate")}</div>}
            </div>

            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t(`dashboardLogs.to`)}</label>
                <DateInput
                    value={to}
                    onChange={(v) => {
                        setTo(v);
                        setTouched(true);
                    }}
                />
                {touched && to && !toOk && <div className="text-xs text-destructive">{t("dashboardLogs.invalidDate")}</div>}
            </div>

            {touched && fromOk && toOk && !rangeOk && <div className="text-xs text-destructive">{t("dashboardLogs.invalidDateRange")}</div>}

            <div className="flex justify-end gap-2 pt-2">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        setFilters((prev) => {
                            const clone = { ...prev };
                            delete clone.createdAt;
                            return clone;
                        });
                        onClose();
                    }}
                >
                    {t(`dashboardLogs.clear`)}
                </Button>

                <Button
                    size="sm"
                    disabled={!canApply}
                    onClick={() => {
                        setTouched(true);
                        if (!canApply) return;

                        setFilters((prev) => ({
                            ...prev,
                            createdAt: {
                                type: "dateRange",
                                from,
                                to,
                            },
                        }));

                        onClose();
                    }}
                >
                    {t(`dashboardLogs.ok`)}
                </Button>
            </div>
        </div>
    );
}

export function DashboardContent() {
    const { t } = useTranslation();
    const rows = useMemo(() => mockLogsFlat(), []);
    const [filters, setFilters] = useState<ExcelFilters>({});
    const [openCol, setOpenCol] = useState<keyof LogRow | null>(null);
    const [searchText, setSearchText] = useState("");

    const filteredRows = useMemo(() => {
        const keyword = searchText.toLowerCase().trim();

        return rows
            .filter((r) =>
                Object.entries(filters).every(([key, f]) => {
                    if (!f) return true;

                    if (f.type === "dateRange" && key === "createdAt") {
                        const rowDate = new Date(r.createdAt);
                        if (f.from && rowDate < new Date(f.from)) return false;
                        if (f.to && rowDate > new Date(f.to + "T23:59:59")) return false;
                        return true;
                    }

                    if (f.type === "values") {
                        if (!f.values.length) return true;
                        return f.values.includes(String((r as any)[key]));
                    }

                    return true;
                }),
            )
            .filter((r) => {
                if (!keyword) return true;

                return (
                    String(r.id).toLowerCase().includes(keyword) ||
                    r.createdAt.toLowerCase().includes(keyword) ||
                    r.createdById.toLowerCase().includes(keyword) ||
                    r.command.toLowerCase().includes(keyword) ||
                    r.sourceTable.toLowerCase().includes(keyword) ||
                    r.sourceIds.toLowerCase().includes(keyword) ||
                    (r.intent ?? "").toLowerCase().includes(keyword)
                );
            });
    }, [rows, filters, searchText]);

    const isFiltered = (key: keyof ExcelFilters) => {
        const f = filters[key];
        if (!f) return false;

        if (f.type === "dateRange") {
            return !!f.from || !!f.to;
        }

        return f.values.length > 0;
    };

    const filteredColClass = "text-primary";

    const columns: (keyof LogRow)[] = ["id", "createdAt", "createdById", "command", "sourceTable", "sourceIds", "data", "intent"];

    return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">{t("dashboardLogs.title")}</h1>

            <div className="flex items-center gap-3">
                <div className="relative w-72">
                    <Input
                        placeholder={t("dashboardLogs.filters.search") ?? "Search..."}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                    />

                    {searchText && (
                        <button type="button" onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            ✕
                        </button>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-card/60 overflow-hidden">
                <div className="overflow-auto">
                    <table className="min-w-[1200px] w-full">
                        <thead className="bg-muted border-b border-gray-400">
                            <tr>
                                {columns.map((col) => (
                                    <th
                                        key={col}
                                        className={cn("p-3 text-left align-top text-lg", isFiltered(col) && (col === "command" ? "text-sky-600 font-semibold" : "text-primary font-semibold"))}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span>{t(`dashboardLogs.columns.${col}`)}</span>

                                            {col !== "data" && col !== "id" && (
                                                <DropdownMenu open={openCol === col} onOpenChange={(v) => setOpenCol(v ? col : null)}>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-1 rounded hover:bg-muted">
                                                            <ChevronDown className="h-4 w-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>

                                                    <DropdownMenuContent align="start">
                                                        {col === "createdAt" ? (
                                                            <DateRangeFilterDropdown filters={filters} setFilters={setFilters} onClose={() => setOpenCol(null)} />
                                                        ) : (
                                                            <ExcelFilterDropdown columnKey={col} rows={rows} filters={filters} setFilters={setFilters} onClose={() => setOpenCol(null)} />
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="bg-sidebar">
                            {filteredRows.map((r) => (
                                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 align-top">
                                    <td className={cn("p-3 font-mono", isFiltered("id") && filteredColClass)}>{r.id}</td>
                                    <td className={cn("p-3 font-mono", isFiltered("createdAt") && filteredColClass)}>{r.createdAt}</td>
                                    <td className={cn("p-3 font-mono", isFiltered("createdById") && filteredColClass)}>{r.createdById}</td>
                                    <td className={cn("p-3", isFiltered("command") && filteredColClass)}>
                                        <Badge className={commandBadgeClass(r.command)}>{t(`dashboardLogs.command.${r.command}`)}</Badge>
                                    </td>
                                    <td className={cn("p-3 font-mono", isFiltered("sourceTable") && filteredColClass)}>{r.sourceTable}</td>
                                    <td className={cn("p-3 font-mono", isFiltered("sourceIds") && filteredColClass)}>{r.sourceIds}</td>
                                    <td className="p-3 min-w-[320px]">
                                        <InlineJsonWithTooltip value={r.data} />
                                    </td>
                                    <td className={cn("p-3 text-md text-muted-foreground", isFiltered("intent") && filteredColClass)}>{r.intent}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
