import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer({ toasts, onDismiss }) {
    if (!toasts || toasts.length === 0) return null;

    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
            case 'warning':
                return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
            case 'error':
            case 'critical':
                return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
            default:
                return <Info className="w-4 h-4 text-sky-400 shrink-0" />;
        }
    };

    const getBorder = (type) => {
        switch (type) {
            case 'success':
                return 'border-emerald-500/30 bg-[#0B1220]/95';
            case 'warning':
                return 'border-amber-500/30 bg-[#0B1220]/95';
            case 'error':
            case 'critical':
                return 'border-rose-500/30 bg-[#0B1220]/95';
            default:
                return 'border-sky-500/30 bg-[#0B1220]/95';
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-xl backdrop-blur-md transition-all duration-200 transform translate-y-0 opacity-100 ${getBorder(
                        toast.type
                    )}`}
                >
                    <div className="mt-0.5">{getIcon(toast.type)}</div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#F8FAFC] tracking-tight">{toast.title}</div>
                        <div className="text-[11px] text-[#94A3B8] leading-relaxed truncate">{toast.message}</div>
                    </div>
                    <button
                        onClick={() => onDismiss(toast.id)}
                        className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors p-1 rounded hover:bg-[#151F32]"
                        title="Dismiss notification"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}
