import { useState, useRef } from "react";
import { UploadCloud, X, FileText } from "lucide-react";

interface UploadedFile {
    file: File;
    id: string;
}

interface CustomerFileUploadProps {
    onFilesChange?: (files: File[]) => void;
    maxFiles?: number;
    maxSizeMB?: number;
}

export function CustomerFileUpload({ onFilesChange, maxFiles = 5, maxSizeMB = 10 }: CustomerFileUploadProps) {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const addFiles = (newFiles: FileList | null) => {
        if (!newFiles) return;

        const remaining = maxFiles - files.length;
        if (remaining <= 0) return;

        const accepted: UploadedFile[] = [];
        for (let i = 0; i < Math.min(newFiles.length, remaining); i++) {
            const f = newFiles[i];
            if (f.size <= maxSizeMB * 1024 * 1024) {
                accepted.push({ file: f, id: `${Date.now()}-${i}-${f.name}` });
            }
        }

        const updated = [...files, ...accepted];
        setFiles(updated);
        onFilesChange?.(updated.map((u) => u.file));
    };

    const removeFile = (id: string) => {
        const updated = files.filter((f) => f.id !== id);
        setFiles(updated);
        onFilesChange?.(updated.map((u) => u.file));
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-3">
            {/* Drop Zone */}
            <div
                className={`
                    relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
                    ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"}
                    ${files.length >= maxFiles ? "opacity-50 pointer-events-none" : ""}
                `}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                />
                <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm font-medium text-foreground">Kéo thả file vào đây hoặc click để chọn</p>
                <p className="text-xs text-muted-foreground mt-1">Tối đa {maxFiles} file, mỗi file ≤ {maxSizeMB}MB</p>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map((f) => (
                        <div
                            key={f.id}
                            className="flex items-center gap-3 px-3 py-2 bg-muted/40 border border-border rounded-lg group"
                        >
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{f.file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatSize(f.file.size)}</p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
