import React, { useState, useRef, useMemo } from "react";
import { X, Upload, FileText, ImageIcon, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface LocalFile {
    id: string;
    file: File;
    tag: string;
}

interface CustomerFileUploadModalProps {
    open: boolean;
    onClose: () => void;
    onUploadSuccess: (fileIds: string[]) => void;
    orderId?: string;
}

const FILE_TAG_OPTIONS = [
    { label: "Hóa đơn", value: "INVOICE" },
    { label: "Đơn hàng", value: "ORDER_FORM" },
    { label: "Phiếu gửi mẫu", value: "SAMPLE_SUBMISSION" },
    { label: "Tiêu chuẩn cơ sở", value: "PRODUCT_SPEC" },
    { label: "Ảnh mẫu", value: "SAMPLE_IMAGE" },
];

export function CustomerFileUploadModal({ open, onClose, onUploadSuccess, orderId }: CustomerFileUploadModalProps) {
    const [selectedFiles, setSelectedFiles] = useState<LocalFile[]>([]);
    const [currentTag, setCurrentTag] = useState<string>("ORDER_FORM");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const totalSize = useMemo(() => {
        return selectedFiles.reduce((acc, f) => acc + f.file.size, 0);
    }, [selectedFiles]);

    const MAX_SIZE = 25 * 1024 * 1024; // 25MB

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newLocalFiles: LocalFile[] = files.map(file => ({
            id: Math.random().toString(36).substring(7),
            file,
            tag: currentTag
        }));

        const incomingSize = newLocalFiles.reduce((acc, f) => acc + f.file.size, 0);
        if (totalSize + incomingSize > MAX_SIZE) {
            toast.error("Tổng dung lượng file không được vượt quá 25MB");
            return;
        }

        setSelectedFiles(prev => [...prev, ...newLocalFiles]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeFile = (id: string) => {
        setSelectedFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleConfirmUpload = async () => {
        if (selectedFiles.length === 0) return;

        setIsUploading(true);
        const uploadedFileIds: string[] = [];

        try {
            // Import dynamically to avoid circular dependencies if any, 
            // though here we can probably import normally.
            const { fileUpload, buildFileUploadFormData } = await import("@/api/customer");

            for (const item of selectedFiles) {
                const formData = buildFileUploadFormData(item.file, {
                    fileTags: [item.tag, "CustomerOrder", orderId || "Draft"].filter(Boolean) as string[],
                    commonKeys: orderId ? [orderId] : []
                });

                const res: any = await fileUpload({ body: formData });
                const fileId = res?.data?.fileId ?? res?.fileId;
                if (fileId) {
                    uploadedFileIds.push(fileId);
                }
            }

            toast.success(`Đã tải lên thành công ${uploadedFileIds.length} tệp tin`);
            onUploadSuccess(uploadedFileIds);
            handleClose();
        } catch (err: any) {
            toast.error(err.message || "Lỗi khi tải lên tệp tin");
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        setSelectedFiles([]);
        setIsUploading(false);
        onClose();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-background rounded-2xl border border-border w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Tải lên tài liệu</h2>
                        <p className="text-sm text-muted-foreground">Chọn phân loại và tải tệp lên đơn hàng</p>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Tag Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">Phân loại tài liệu</label>
                        <div className="flex flex-wrap gap-2">
                            {FILE_TAG_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setCurrentTag(opt.value)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                                        currentTag === opt.value
                                            ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* File Dropzone/Button */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                    >
                        <input 
                            type="file" 
                            multiple 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileSelect}
                        />
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <Upload className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold">Thấn vào để chọn tệp</p>
                        <p className="text-xs text-muted-foreground mt-1">Dung lượng tối đa cho phép: 25MB</p>
                    </div>

                    {/* Selected Files List */}
                    {selectedFiles.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-foreground">Danh sách tệp đã chọn ({selectedFiles.length})</label>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${totalSize > MAX_SIZE ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                                    {(totalSize / (1024 * 1024)).toFixed(2)} MB / 25 MB
                                </span>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {selectedFiles.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border group animate-in slide-in-from-left duration-200">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="shrink-0 w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center">
                                                {item.file.type.startsWith("image/") ? <ImageIcon className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-blue-500" />}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-medium truncate max-w-[200px]">{item.file.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-muted-foreground">{(item.file.size / 1024).toFixed(1)} KB</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-background rounded border border-border font-bold uppercase text-primary">
                                                        {FILE_TAG_OPTIONS.find(o => o.value === item.tag)?.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => removeFile(item.id)}
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {totalSize > 0 ? (
                            <>
                                <CheckCircle2 className="w-4 h-4 text-success" />
                                <span>Đã sẵn sàng tải lên</span>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-4 h-4" />
                                <span>Chưa chọn tệp nào</span>
                            </>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                            Hủy
                        </Button>
                        <Button 
                            onClick={handleConfirmUpload} 
                            disabled={isUploading || selectedFiles.length === 0 || totalSize > MAX_SIZE}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 shadow-lg shadow-primary/20"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang tải lên...
                                </>
                            ) : (
                                "Xác nhận tải lên"
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
