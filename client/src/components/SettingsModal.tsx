import { useState } from "react";
import { Settings as SettingsIcon, Save, X, Server, HeartPulse, Unlink, Sparkles } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatewayWsUrl: string;
  onSave: (url: string) => void;
  familyId?: string;
  pairingCode?: string;
  username?: string;
  adminPhone?: string;
  elderName?: string;
  aiName?: string;
  familyName?: string;
  onLogout?: () => void;
  onUnpair?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  gatewayWsUrl,
  onSave,
  pairingCode,
  username,
  adminPhone,
  elderName,
  aiName,
  familyName,
  onLogout,
  onUnpair,
}) => {
  const [url, setUrl] = useState(gatewayWsUrl);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(url);
    onClose();
  };

  const handleSignOut = () => {
    if (onLogout) onLogout();
    else if (onUnpair) onUnpair();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-xl animate-fade-in pt-safe pb-safe">
      <div className="w-full max-w-lg bg-gradient-to-b from-slate-50 to-white border-2 sm:border-[6px] border-slate-300 rounded-3xl sm:rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.2)] flex flex-col max-h-[88dvh] overflow-hidden">
        {/* Sticky Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-slate-200/60 shrink-0 bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-700 shrink-0 shadow-inner border border-white">
              <SettingsIcon className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-sm" />
            </div>
            <div>
              <h2 className="text-elder-lg sm:text-elder-xl font-black text-slate-900 leading-tight drop-shadow-sm">Cài Đặt</h2>
              <p className="text-elder-sm font-bold text-slate-500">Dành cho kỹ thuật viên</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-[1.25rem] bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center text-stone-600 hover:from-stone-200 hover:to-stone-300 border-[3px] border-stone-300/50 shadow-md active:scale-95 transition-all shrink-0"
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-sm" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Account Information */}
          {(pairingCode || username || adminPhone || familyName) && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-teal-50 to-teal-100/50 border-[3px] border-teal-200 space-y-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-200 rounded-full blur-3xl opacity-30 -mr-10 -mt-10 pointer-events-none"></div>
              
              <div className="flex flex-wrap items-center justify-between gap-2 relative z-10">
                <div className="flex items-center gap-2 text-teal-900 font-black text-elder-base">
                  <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 shrink-0" />
                  <span className="drop-shadow-sm">Tài Khoản Đang Dùng</span>
                </div>
                {(username || adminPhone) && (
                  <span className="px-3 py-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold text-elder-sm rounded-xl shadow-sm">
                    TK: {username || adminPhone}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/80 p-3 sm:p-4 rounded-2xl border border-teal-100 shadow-inner">
                  <span className="text-elder-sm text-teal-700/80 font-bold block mb-1">Gia đình:</span>
                  <span className="font-black text-slate-800 text-elder-base leading-tight block truncate">{familyName || "Gia đình"}</span>
                </div>
                <div className="bg-white/80 p-3 sm:p-4 rounded-2xl border border-teal-100 shadow-inner">
                  <span className="text-elder-sm text-teal-700/80 font-bold block mb-1">Cụ:</span>
                  <span className="font-black text-slate-800 text-elder-base leading-tight block truncate">{elderName || "Cụ"}</span>
                </div>
              </div>

              <div className="bg-white/90 p-4 rounded-2xl border border-teal-200 shadow-sm relative z-10">
                <span className="text-elder-sm text-teal-700/80 font-bold block mb-1">Tên AI nhận diện:</span>
                <span className="font-black text-teal-800 text-elder-base sm:text-elder-lg flex items-center gap-2 mt-1">
                  <Sparkles className="w-5 h-5 text-teal-500 shrink-0" />
                  <span className="drop-shadow-sm">{aiName || "An Nhiên"}</span>
                </span>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full py-4 px-4 rounded-[1.25rem] bg-gradient-to-br from-white to-red-50 border-[3px] border-red-200 text-red-700 hover:from-red-50 hover:to-red-100 font-black text-elder-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm relative z-10"
              >
                <Unlink className="w-5 h-5 text-red-500 shrink-0" />
                <span>Đăng Xuất Tài Khoản</span>
              </button>
            </div>
          )}

          {/* WebSocket Server Configuration */}
          <div className="space-y-3 p-5 rounded-3xl bg-slate-100/80 border-[3px] border-slate-200 shadow-inner">
            <label className="block text-elder-base font-black text-slate-800 flex items-center gap-2 drop-shadow-sm">
              <Server className="w-6 h-6 text-slate-600 shrink-0" />
              <span>Địa chỉ Máy chủ (Gateway):</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="wss://annien.baoduong.dev/ws/live"
              className="w-full px-4 py-4 rounded-[1.25rem] border-[3px] border-slate-300 text-elder-base sm:text-elder-lg font-mono font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 shadow-inner bg-white transition-all break-all"
            />
            <p className="text-elder-sm font-bold text-slate-500 leading-relaxed pt-2">
              Mặc định: <code className="bg-slate-200/70 px-2 py-1 rounded-lg text-slate-700">wss://annien.baoduong.dev/ws/live</code>
            </p>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t-2 border-slate-200/60 bg-white/80 backdrop-blur-md shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-4 rounded-[1.25rem] border-[3px] border-stone-300 font-black text-stone-700 text-elder-base hover:bg-stone-100 active:scale-95 transition-all"
          >
            Đóng
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-4 rounded-[1.25rem] bg-gradient-to-br from-teal-500 to-teal-700 text-white font-black text-elder-base flex items-center gap-2 hover:from-teal-600 hover:to-teal-800 active:scale-95 transition-all shadow-[0_4px_15px_rgba(20,184,166,0.4)] border-2 border-teal-800"
          >
            <Save className="w-6 h-6 drop-shadow-md" />
            <span className="drop-shadow-sm">Lưu cấu hình</span>
          </button>
        </div>
      </div>
    </div>
  );
};
