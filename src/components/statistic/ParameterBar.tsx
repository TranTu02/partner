interface ParameterBarProps {
    name: string;
    count: number;
}

export function ParameterBar({ name, count }: ParameterBarProps) {
    const percentage = (count / 45) * 100;

    return (
        <div>
            <div className="flex justify-between mb-1">
                <span className="text-sm text-foreground">{name}</span>
                <span className="text-sm font-medium text-foreground">{count}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
}
