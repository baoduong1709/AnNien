import { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  Settings as SettingsIcon,
} from "lucide-react";
import { AudioOrb } from "./components/AudioOrb";
import { LiveTranscript } from "./components/LiveTranscript";
import { SosModal } from "./components/SosModal";
import { MedicationModal } from "./components/MedicationModal";
import { MoodHistoryModal } from "./components/MoodHistoryModal";
import { SettingsModal } from "./components/SettingsModal";
import { CaregiverDashboard } from "./components/CaregiverDashboard";
import { ElderPairingScreen } from "./components/ElderPairingScreen";
import { useLiveSession } from "./hooks/useLiveSession";

export function App() {
  const [gatewayUrl, setGatewayUrl] = useState<string>(() => {
    const saved = localStorage.getItem("annien_gateway_url");
    if (saved && !saved.includes("annien.baoduong.dev") && saved !== "ws://192.168.1.3:8080/ws/live") {
      return saved;
    }
    // Clear old saved URL
    localStorage.removeItem("annien_gateway_url");
    return "ws://localhost:8080/ws/live";
  });
  const [isSosOpen, setIsSosOpen] = useState<boolean>(false);
  const [isMedOpen, setIsMedOpen] = useState<boolean>(false);
  const [isMoodOpen, setIsMoodOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [sosAlertMessage, setSosAlertMessage] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");

  // Family Pairing & Identity State
  const [pairingCode, setPairingCode] = useState<string>(
    () => localStorage.getItem("annien_elder_pairing_code") || ""
  );
  const [familyId, setFamilyId] = useState<string>(
    () => localStorage.getItem("annien_family_id") || ""
  );
  const [username, setUsername] = useState<string>(
    () => localStorage.getItem("annien_username") || ""
  );
  const [adminPhone, setAdminPhone] = useState<string>(
    () => localStorage.getItem("annien_admin_phone") || ""
  );
  const [elderName, setElderName] = useState<string>(
    () => localStorage.getItem("annien_elder_name") || "Bác An"
  );
  const [familyName, setFamilyName] = useState<string>(
    () => localStorage.getItem("annien_elder_family_name") || "Gia Đình Bác An"
  );
  const [customAiName, setCustomAiName] = useState<string>(
    () => localStorage.getItem("annien_elder_ai_name") || "Cháu Út"
  );

  const {
    status,
    transcripts,
    volumeLevel,
    medications,
    moods,
    memories,
    aiName: liveAiName,
    isStandby,
    connect,
    disconnect,
    triggerBargeIn,
    triggerSos,
    setMedications,
    isTauri,
  } = useLiveSession({
    gatewayWsUrl: gatewayUrl,
    pairingCode: pairingCode || undefined,
    onSosAlert: (message) => {
      setSosAlertMessage(message);
      setIsSosOpen(true);
    },
    onMedicationUpdated: (medName) => {
      console.log("Medication updated via voice:", medName);
    },
    onStandbyMode: (msg) => {
      console.log("Assistant entered standby:", msg);
    },
  });

  const effectiveAiName = liveAiName || customAiName || "Cháu Út";

  // Update clock every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const dayName = days[now.getDay()];
      const timeStr = `${dayName}, ngày ${now.getDate()} tháng ${now.getMonth() + 1} • ${now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
      setCurrentTime(timeStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize latest elder profile and AI name from backend
  useEffect(() => {
    if (!pairingCode) return;
    const httpBase = gatewayUrl.replace("ws://", "http://").replace("wss://", "https://").replace("/ws/live", "");
    fetch(`${httpBase}/api/v1/families/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairing_code: pairingCode }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((fam) => {
        if (fam) {
          if (fam.id) {
            setFamilyId(fam.id);
            localStorage.setItem("annien_family_id", fam.id);
          }
          if (fam.username) {
            setUsername(fam.username);
            localStorage.setItem("annien_username", fam.username);
          }
          if (fam.admin_phone) {
            setAdminPhone(fam.admin_phone);
            localStorage.setItem("annien_admin_phone", fam.admin_phone);
          }
          if (fam.family_name) {
            setFamilyName(fam.family_name);
            localStorage.setItem("annien_elder_family_name", fam.family_name);
          }
          if (fam.elder) {
            if (fam.elder.ai_name) {
              setCustomAiName(fam.elder.ai_name);
              localStorage.setItem("annien_elder_ai_name", fam.elder.ai_name);
            }
            if (fam.elder.preferred_name) {
              setElderName(fam.elder.preferred_name);
              localStorage.setItem("annien_elder_name", fam.elder.preferred_name);
            }
          }
        }
      })
      .catch(() => {});
  }, [pairingCode, gatewayUrl]);

  // Auto-connect khi mở app (1 lần duy nhất)
  const hasAutoConnected = useRef(false);
  useEffect(() => {
    if (pairingCode && status === "idle" && !isStandby && isTauri && !hasAutoConnected.current) {
      hasAutoConnected.current = true;
      const timer = setTimeout(() => {
        connect();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [pairingCode, status, isStandby, isTauri]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleSession = () => {
    if (status === "idle") {
      connect();
    } else {
      disconnect();
    }
  };

  const handleConfirmSos = async (reason: string) => {
    try {
      await triggerSos(reason);
    } catch (e) {
      console.warn("Failed to trigger SOS via session:", e);
    }

    try {
      const httpBase = gatewayUrl.replace("ws://", "http://").replace("wss://", "https://").replace("/ws/live", "");
      await fetch(`${httpBase}/api/v1/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          severity: "CRITICAL",
          reason,
          location: "Nhà ở"
        })
      });
    } catch (e) {
      console.warn("Failed to dispatch SOS via REST fallback:", e);
    }
  };

  const handleToggleMedTaken = (id: string) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_taken: !m.is_taken } : m))
    );
  };

  const handlePaired = (data: {
    pairingCode: string;
    familyName: string;
    elderName: string;
    aiName: string;
    familyId?: string;
    username?: string;
    adminPhone?: string;
  }) => {
    setPairingCode(data.pairingCode);
    setFamilyName(data.familyName);
    setElderName(data.elderName);
    setCustomAiName(data.aiName);
    if (data.familyId) setFamilyId(data.familyId);
    if (data.username) setUsername(data.username);
    if (data.adminPhone) setAdminPhone(data.adminPhone);

    localStorage.setItem("annien_elder_pairing_code", data.pairingCode);
    localStorage.setItem("annien_elder_family_name", data.familyName);
    localStorage.setItem("annien_elder_name", data.elderName);
    localStorage.setItem("annien_elder_ai_name", data.aiName);
    if (data.familyId) localStorage.setItem("annien_family_id", data.familyId);
    if (data.username) localStorage.setItem("annien_username", data.username);
    if (data.adminPhone) localStorage.setItem("annien_admin_phone", data.adminPhone);
  };

  const handleUnpair = () => {
    localStorage.removeItem("annien_elder_pairing_code");
    localStorage.removeItem("annien_elder_family_name");
    localStorage.removeItem("annien_elder_name");
    localStorage.removeItem("annien_elder_ai_name");
    localStorage.removeItem("annien_family_id");
    localStorage.removeItem("annien_username");
    localStorage.removeItem("annien_admin_phone");
    setPairingCode("");
    setFamilyId("");
    setUsername("");
    setAdminPhone("");
    disconnect();
  };

  const gatewayHttpUrl = gatewayUrl
    .replace("ws://", "http://")
    .replace("wss://", "https://")
    .replace("/ws/live", "");

  // 1. Bản Web Browser (!isTauri): Dành riêng cho con cháu quản lý
  if (!isTauri) {
    return (
      <CaregiverDashboard
        gatewayHttpUrl={gatewayHttpUrl}
        apkDownloadUrl={`${gatewayHttpUrl}/api/v1/download/apk`}
      />
    );
  }

  // 2. Ứng dụng Android APK trên điện thoại của cụ (isTauri)
  // Nếu máy chưa kết nối, hiện màn hình nhập mã kết nối từ con cháu một lần duy nhất
  if (!pairingCode) {
    return (
      <ElderPairingScreen
        gatewayHttpUrl={gatewayHttpUrl}
        onUpdateGatewayUrl={(newWsUrl) => setGatewayUrl(newWsUrl)}
        onPaired={handlePaired}
      />
    );
  }

  // 3. Màn hình đàm thoại giọng nói cho cụ trên điện thoại Android (Hands-free Voice UX)
  // Giao diện tối giản tuyệt đối: AudioOrb + SOS, mọi thứ khác điều khiển bằng giọng nói
  return (
    <div className="h-[100dvh] max-h-[100dvh] flex flex-col bg-annien-bg max-w-4xl mx-auto selection:bg-teal-200 overflow-hidden pt-safe pb-safe">
      {/* Top bar: chỉ hiện trạng thái nhỏ gọn + nút settings cho kỹ thuật viên */}
      <header className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="relative flex h-3 w-3 shrink-0">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                status !== "idle" ? "bg-emerald-400" : isStandby ? "bg-amber-400" : "bg-stone-300"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                status !== "idle" ? "bg-emerald-500" : isStandby ? "bg-amber-500" : "bg-stone-400"
              }`}
            />
          </span>
          <span className="text-base font-bold text-stone-500 truncate">
            {currentTime || `Trợ lý ${effectiveAiName}`}
          </span>
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Cài đặt"
          className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400 active:scale-95 transition-all shrink-0"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      {/* Center Stage: AudioOrb chiếm toàn bộ trung tâm */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 overflow-hidden">
        <AudioOrb
          state={status}
          volumeLevel={volumeLevel}
          onToggleSession={handleToggleSession}
          onBargeIn={triggerBargeIn}
        />

        {/* Phụ đề đàm thoại */}
        <div className="w-full max-w-md mt-2">
          <LiveTranscript items={transcripts} />
        </div>
      </main>

      {/* Bottom: Nút SOS duy nhất — lớn, rõ ràng, dễ chạm */}
      <footer className="px-4 pb-4 pt-2 shrink-0">
        <button
          onClick={() => setIsSosOpen(true)}
          className="w-full py-5 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-2xl font-black text-2xl flex items-center justify-center gap-3 border-b-4 border-red-800 shadow-lg shadow-red-600/30 active:scale-[0.98] active:border-b-2 active:translate-y-[2px] transition-all"
        >
          <ShieldAlert className="w-8 h-8" />
          <span>SOS KHẨN CẤP</span>
        </button>
      </footer>

      {/* Modals — vẫn giữ để hiển thị khi AI trigger qua giọng nói */}
      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        onConfirmSos={handleConfirmSos}
        activeAlertMessage={sosAlertMessage}
      />

      <MedicationModal
        isOpen={isMedOpen}
        onClose={() => setIsMedOpen(false)}
        medications={medications}
        onToggleTaken={handleToggleMedTaken}
      />

      <MoodHistoryModal
        isOpen={isMoodOpen}
        onClose={() => setIsMoodOpen(false)}
        moods={moods}
        memories={memories}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        gatewayWsUrl={gatewayUrl}
        onSave={(newUrl) => {
          setGatewayUrl(newUrl);
          localStorage.setItem("annien_gateway_url", newUrl);
        }}
        familyId={familyId}
        pairingCode={pairingCode}
        username={username}
        adminPhone={adminPhone}
        familyName={familyName}
        elderName={elderName}
        aiName={effectiveAiName}
        onLogout={handleUnpair}
        onUnpair={handleUnpair}
      />
    </div>
  );
}
