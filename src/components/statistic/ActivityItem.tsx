interface ActivityItemProps {
    title: string;
    description: string;
    time: string;
}

export function ActivityItem({ title, description, time }: ActivityItemProps) {
    return (
        <div className="flex items-start gap-3 pb-4 border-b border-border last:border-b-0 last:pb-0">
            <div className="w-2 h-2 bg-primary rounded-full mt-2" />
            <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{title}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
                <div className="text-xs text-muted-foreground mt-1">{time}</div>
            </div>
        </div>
    );
}
