import React, { useState, useEffect } from "react";
import {
  HeartPulse,
  Pill,
  Brain,
  ShieldAlert,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Search,
  CheckCircle,
  AlertTriangle,
  Smile,
  RefreshCw,
  PhoneCall,
  Users,
  Copy,
  Check,
  UserCheck,
  Save,
  QrCode,
  ChevronDown,
  LogOut,
  LogIn,
  KeyRound,
  X,
} from "lucide-react";

export interface Medication {
  id: string;
  family_id?: string;
  medicine_name: string;
  time_str: string;
  dosage: string;
  note?: string;
  is_taken: boolean;
}

export interface MoodRecord {
  id: string;
  family_id?: string;
  sentiment: string;
  emotion: string;
  notes: string;
  timestamp: string;
}

export interface MemoryItem {
  id: string;
  family_id?: string;
  category?: string;
  content: string;
  importance?: number;
  tags?: string[];
  extracted_at?: string;
  created_at?: string;
}

export interface ElderProfile {
  id: string;
  family_id: string;
  full_name: string;
  preferred_name: string;
  honorific: string;
  birth_year: number;
  address?: string;
  primary_caregiver_phone: string;
  medical_notes?: string;
  ai_name?: string;
  updated_at?: string;
}

export interface FamilyAccount {
  id: string;
  username?: string;
  password?: string;
  family_name: string;
  admin_phone: string;
  pairing_code: string;
  created_at: string;
  elder?: ElderProfile;
}

interface CaregiverDashboardProps {
  gatewayHttpUrl: string;
  apkDownloadUrl?: string;
}

export function CaregiverDashboard({ gatewayHttpUrl }: CaregiverDashboardProps) {
  const [activeTab, setActiveTab] = useState<"wellbeing" | "medications" | "memories" | "sos" | "profile">("wellbeing");
  const [loading, setLoading] = useState<boolean>(false);

  // Multi-Tenancy Family States
  const [families, setFamilies] = useState<FamilyAccount[]>([]);
  const [currentFamily, setCurrentFamily] = useState<FamilyAccount | null>(null);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAddMedForm, setShowAddMedForm] = useState(false);
  const [showAddMemoryForm, setShowAddMemoryForm] = useState(false);

  // Registration Form
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regFamilyName, setRegFamilyName] = useState("");
  const [regAdminPhone, setRegAdminPhone] = useState("");
  const [regElderFullName, setRegElderFullName] = useState("");
  const [regElderPrefName, setRegElderPrefName] = useState("");
  const [regAiName, setRegAiName] = useState("An Nhiên");
  const [regHonorific, setRegHonorific] = useState("Bác");
  const [regBirthYear, setRegBirthYear] = useState(1948);
  const [regAddress, setRegAddress] = useState("");
  const [regMedicalNotes, setRegMedicalNotes] = useState("");

  // Edit Elder Profile Form
  const [editFullName, setEditFullName] = useState("");
  const [editPrefName, setEditPrefName] = useState("");
  const [editAiName, setEditAiName] = useState("An Nhiên");
  const [editHonorific, setEditHonorific] = useState("Bác");
  const [editBirthYear, setEditBirthYear] = useState(1948);
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  // Data states
  const [medications, setMedications] = useState<Medication[]>([]);
  const [moods, setMoods] = useState<MoodRecord[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [sosLogs, setSosLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Form states
  const [newMedName, setNewMedName] = useState("");
  const [newMedTime, setNewMedTime] = useState("08:00");
  const [newMedDosage, setNewMedDosage] = useState("1 viên sau ăn");
  const [newMedInstructions, setNewMedInstructions] = useState("");

  const [newMemorySubject, setNewMemorySubject] = useState("");
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [newMemoryTag, setNewMemoryTag] = useState("Gia đình");

  const [wellnessBriefing] = useState<{
    summary: string;
    dominant_mood: string;
    anxiety_detected: boolean;
    insights: string[];
  }>({
    summary: "Hôm nay cụ có tâm trạng thư thái, trò chuyện vui vẻ về kỷ niệm thời trẻ và nhắc nhớ cháu gái. Không phát hiện triệu chứng đau tức hay lo âu cấp tính.",
    dominant_mood: "Vui vẻ, Thảnh thơi",
    anxiety_detected: false,
    insights: [
      "Cụ đã uống đúng cữ thuốc huyết áp buổi sáng lúc 08:15.",
      "Cụ có hỏi thăm xem cuối tuần này các cháu có về thăm quê không.",
      "Nhịp nói chuyện ấm áp, tốc độ phản xạ ngôn ngữ tốt."
    ],
  });

  // Login States
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Fetch Families
  const fetchFamilies = async () => {
    try {
      const res = await fetch(`${gatewayHttpUrl}/api/v1/families`);
      if (res.ok) {
        const data: FamilyAccount[] = await res.json();
        setFamilies(data);
        const savedId = localStorage.getItem("annien_family_id");
        if (savedId && savedId !== "logged_out") {
          const found = data.find((f) => f.id === savedId);
          if (found) {
            selectFamily(found);
            return;
          }
        }
        if (savedId !== "logged_out" && data.length > 0 && !currentFamily) {
          selectFamily(data[0]);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch families:", err);
    }
  };

  const selectFamily = (fam: FamilyAccount) => {
    setCurrentFamily(fam);
    localStorage.setItem("annien_family_id", fam.id);
    if (fam.elder) {
      setEditFullName(fam.elder.full_name || "");
      setEditPrefName(fam.elder.preferred_name || "");
      setEditAiName(fam.elder.ai_name || "An Nhiên");
      setEditHonorific(fam.elder.honorific || "Bác");
      setEditBirthYear(fam.elder.birth_year || 1948);
      setEditAddress(fam.elder.address || "");
      setEditPhone(fam.elder.primary_caregiver_phone || "");
      setEditNotes(fam.elder.medical_notes || "");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim()) return;
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch(`${gatewayHttpUrl}/api/v1/families/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: loginIdentifier.trim() })
      });
      if (res.ok) {
        const fam: FamilyAccount = await res.json();
        selectFamily(fam);
        setLoginIdentifier("");
      } else {
        setLoginError("Không tìm thấy gia đình với mã kết nối hoặc số điện thoại này.");
      }
    } catch (err) {
      setLoginError("Lỗi kết nối tới máy chủ.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.setItem("annien_family_id", "logged_out");
    setCurrentFamily(null);
    setLoginError("");
  };

  // Fetch family-specific data
  const fetchData = async (familyId?: string) => {
    const fId = familyId || currentFamily?.id || "fam_default";
    setLoading(true);
    try {
      // 1. Medications
      const medRes = await fetch(`${gatewayHttpUrl}/api/v1/medications?family_id=${fId}`).catch(() => null);
      if (medRes && medRes.ok) {
        const data = await medRes.json();
        setMedications(data);
      }

      // 2. Moods
      const moodRes = await fetch(`${gatewayHttpUrl}/api/v1/moods?family_id=${fId}`).catch(() => null);
      if (moodRes && moodRes.ok) {
        const data = await moodRes.json();
        setMoods(data);
      }

      // 3. Memories
      const memRes = await fetch(`${gatewayHttpUrl}/api/v1/memories?family_id=${fId}`).catch(() => null);
      if (memRes && memRes.ok) {
        const data = await memRes.json();
        setMemories(data.memories || []);
      }

      // 4. SOS Logs
      const sosRes = await fetch(`${gatewayHttpUrl}/api/v1/sos/logs?family_id=${fId}`).catch(() => null);
      if (sosRes && sosRes.ok) {
        const data = await sosRes.json();
        setSosLogs(data);
      }
    } catch (err) {
      console.warn("Failed to fetch caregiver data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilies();
  }, [gatewayHttpUrl]);

  useEffect(() => {
    if (currentFamily) {
      fetchData(currentFamily.id);
    }
  }, [currentFamily?.id]);

  const copyPairingCode = () => {
    if (!currentFamily) return;
    navigator.clipboard.writeText(currentFamily.pairing_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Register New Family
  const handleRegisterFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFamilyName.trim() || !regElderFullName.trim()) return;

    const payload = {
      username: regUsername.trim() || undefined,
      password: regPassword.trim() || "123456",
      family_name: regFamilyName.trim(),
      admin_phone: regAdminPhone.trim() || "0900000000",
      elder_full_name: regElderFullName.trim(),
      elder_preferred_name: regElderPrefName.trim() || regElderFullName.trim(),
      honorific: regHonorific,
      birth_year: Number(regBirthYear) || 1948,
      address: regAddress.trim(),
      medical_notes: regMedicalNotes.trim() || undefined,
      ai_name: regAiName.trim() || "An Nhiên"
    };

    try {
      const res = await fetch(`${gatewayHttpUrl}/api/v1/families/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newFam: FamilyAccount = await res.json();
        setFamilies((prev) => [...prev, newFam]);
        selectFamily(newFam);
        setIsRegisterMode(false);
        setIsFamilyModalOpen(false);
        setRegUsername("");
        setRegPassword("");
        setRegFamilyName("");
        setRegElderFullName("");
        setRegElderPrefName("");
        setRegAiName("An Nhiên");
      }
    } catch (err) {
      console.error("Error registering family:", err);
    }
  };

  // Save Elder Profile Updates
  const handleSaveElderProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFamily) return;

    const updates = {
      full_name: editFullName.trim(),
      preferred_name: editPrefName.trim(),
      honorific: editHonorific,
      birth_year: Number(editBirthYear),
      address: editAddress.trim(),
      primary_caregiver_phone: editPhone.trim(),
      medical_notes: editNotes.trim(),
      ai_name: editAiName.trim() || "An Nhiên"
    };

    try {
      const res = await fetch(`${gatewayHttpUrl}/api/v1/families/${currentFamily.id}/elder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updatedElder: ElderProfile = await res.json();
        setCurrentFamily((prev) => prev ? { ...prev, elder: updatedElder } : prev);
        setProfileSuccessMsg("Đã cập nhật hồ sơ cụ thành công! AI sẽ điều chỉnh xưng hô ngay lập tức.");
        setTimeout(() => setProfileSuccessMsg(""), 3500);
      }
    } catch (err) {
      console.error("Error updating elder profile:", err);
    }
  };

  // Handle Add Medication
  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim() || !currentFamily) return;

    const newMed: Medication = {
      id: `med_${Date.now()}`,
      family_id: currentFamily.id,
      medicine_name: newMedName.trim(),
      time_str: newMedTime,
      dosage: newMedDosage.trim(),
      note: newMedInstructions.trim(),
      is_taken: false,
    };

    try {
      const res = await fetch(`${gatewayHttpUrl}/api/v1/medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMed),
      });
      if (res.ok) {
        setMedications((prev) => [...prev, newMed]);
        setNewMedName("");
        setNewMedInstructions("");
        setShowAddMedForm(false);
      }
    } catch (err) {
      console.error("Error adding medication:", err);
    }
  };

  // Handle Delete Medication
  const handleDeleteMedication = async (id: string) => {
    try {
      await fetch(`${gatewayHttpUrl}/api/v1/medications/${id}`, { method: "DELETE" });
      setMedications((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Error deleting medication:", err);
    }
  };

  // Handle Toggle Taken Status
  const handleToggleTaken = (id: string) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_taken: !m.is_taken } : m))
    );
  };

  // Handle Add Memory
  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryContent.trim() || !currentFamily) return;

    const newMem: MemoryItem = {
      id: `mem_${Date.now()}`,
      family_id: currentFamily.id,
      category: "family",
      content: newMemoryContent.trim(),
      importance: 4,
      tags: [newMemoryTag, newMemorySubject.trim()].filter(Boolean),
      created_at: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${gatewayHttpUrl}/api/v1/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMem),
      });
      if (res.ok) {
        setMemories((prev) => [newMem, ...prev]);
        setNewMemoryContent("");
        setNewMemorySubject("");
        setShowAddMemoryForm(false);
      }
    } catch (err) {
      console.error("Error adding memory:", err);
    }
  };

  // Handle Memory Search
  const handleSearchMemory = async () => {
    if (!searchQuery.trim() || !currentFamily) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(
        `${gatewayHttpUrl}/api/v1/memories?q=${encodeURIComponent(searchQuery)}&family_id=${currentFamily.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  if (!currentFamily) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 selection:bg-teal-200">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 sm:p-8 space-y-6 border border-slate-200">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
              <HeartPulse className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">An Nhiên Caregiver</h1>
            <p className="text-xs text-slate-500">
              Đăng nhập tài khoản gia đình để theo dõi sức khỏe & ký ức người thân
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mã Kết Nối (ANN-xxxx) hoặc Số Điện Thoại Quản Trị
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: ANN-8866 hoặc 0912345678"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoggingIn ? "Đang xác thực..." : "Đăng Nhập"}</span>
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Hoặc
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-700">Tài khoản gia đình có sẵn (Chọn nhanh):</div>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {families.map((fam) => (
                <div
                  key={fam.id}
                  onClick={() => selectFamily(fam)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 cursor-pointer flex items-center justify-between transition-all"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{fam.family_name}</div>
                    <div className="text-[11px] text-slate-500">Cụ: {fam.elder?.preferred_name || "Cụ"}</div>
                  </div>
                  <span className="text-xs font-mono font-black text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md">
                    {fam.pairing_code}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setIsRegisterMode(true);
                setIsFamilyModalOpen(true);
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Đăng Ký Gia Đình Mới</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900/10 flex justify-center selection:bg-teal-200">
      {/* Mobile-First Shell (Edge-to-edge on mobile, sleek phone frame centered on desktop) */}
      <div className="w-full max-w-md min-h-screen bg-slate-50 text-slate-900 flex flex-col relative shadow-2xl sm:border-x sm:border-slate-200">
        
        {/* ==================================================== */}
        {/* STICKY TOP APP BAR (MOBILE)                          */}
        {/* ==================================================== */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 py-2.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Family Switcher Pill */}
            <button
              onClick={() => {
                setIsRegisterMode(false);
                setIsFamilyModalOpen(true);
              }}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 active:scale-95 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-all text-left truncate"
              title="Chạm để đổi hoặc tạo gia đình khác"
            >
              <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                <HeartPulse className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-none">Gia Đình</div>
                <div className="text-xs font-black text-slate-900 truncate max-w-[125px]">
                  {currentFamily?.family_name || "Gia đình"}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
            </button>

            {/* Right: Pairing Code Pill, 115 Button, Logout */}
            <div className="flex items-center gap-1.5 shrink-0">
              {currentFamily && (
                <button
                  onClick={copyPairingCode}
                  className="flex items-center gap-1 bg-teal-50 hover:bg-teal-100 active:scale-95 border border-teal-200 text-teal-900 px-2 py-1.5 rounded-xl transition-all shadow-xs"
                  title="Chạm để sao chép mã máy cụ"
                >
                  <QrCode className="w-3.5 h-3.5 text-teal-700" />
                  <span className="text-xs font-mono font-black">{currentFamily.pairing_code}</span>
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-teal-600" />}
                </button>
              )}

              <a
                href="tel:115"
                className="w-8 h-8 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 flex items-center justify-center text-white shadow-xs transition-all"
                title="Gọi Cấp Cứu 115"
              >
                <PhoneCall className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handleLogout}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 active:scale-95 border border-slate-200 flex items-center justify-center text-slate-700 transition-all"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sub-bar: Elder Info & Refresh */}
          {currentFamily?.elder && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="font-semibold text-slate-900 truncate">
                  {currentFamily.elder.honorific} {currentFamily.elder.preferred_name}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 text-[11px] shrink-0">
                  {new Date().getFullYear() - (currentFamily.elder.birth_year || 1948)} tuổi
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => fetchData()}
                  disabled={loading}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 active:scale-95"
                  title="Làm mới dữ liệu"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
          )}
        </header>

        {/* ==================================================== */}
        {/* TAB CONTENTS (SCROLLABLE MOBILE BODY)                */}
        {/* ==================================================== */}
        <main className="flex-1 px-3.5 py-4 space-y-4 pb-24 overflow-y-auto">
          {/* TAB 1: AN SINH */}
          {activeTab === "wellbeing" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Smile className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-slate-500 leading-tight">Tâm trạng</div>
                    <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                      {wellnessBriefing.dominant_mood}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-slate-500 leading-tight">Uống thuốc</div>
                    <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                      {medications.filter((m) => m.is_taken).length} / {medications.length} cữ
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-slate-500 leading-tight">Ký ức lưu</div>
                    <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                      {memories.length} mẩu chuyện
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    sosLogs.length > 0 ? "bg-red-100 text-red-600 animate-pulse" : "bg-slate-100 text-slate-600"
                  }`}>
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-slate-500 leading-tight">Báo động SOS</div>
                    <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                      {sosLogs.length > 0 ? `${sosLogs.length} sự cố` : "An toàn"}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Wellness Analysis Card */}
              <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white rounded-3xl p-5 shadow-md relative overflow-hidden space-y-3">
                <div className="flex items-center gap-1.5 text-teal-300 text-[10px] font-bold tracking-wider uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>AI Báo Cáo An Sinh (Gemini 3.8 Flash)</span>
                </div>

                <h2 className="text-base font-black leading-snug">
                  Tình trạng của {currentFamily?.elder?.preferred_name || "cụ"} hôm nay
                </h2>

                <p className="text-teal-100 text-xs leading-relaxed bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                  {wellnessBriefing.summary}
                </p>

                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold text-teal-200 uppercase tracking-wider">
                    Điểm nổi bật trong ngày:
                  </div>
                  <div className="space-y-1.5">
                    {wellnessBriefing.insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-black/20 p-2.5 rounded-xl border border-white/5 text-xs text-teal-50">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Mood Stream */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-teal-600" />
                  <span>Nhật ký cảm xúc ghi nhận từ cuộc đàm thoại</span>
                </h3>

                {moods.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Chưa có ghi nhận cảm xúc bất thường nào trong ngày hôm nay.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {moods.map((mood) => (
                      <div key={mood.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">{mood.emotion}</span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-teal-100 text-teal-800 font-semibold uppercase">
                              {mood.sentiment}
                            </span>
                          </div>
                          {mood.notes && <p className="text-xs text-slate-600 mt-1">{mood.notes}</p>}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                          {new Date(mood.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ĐƠN THUỐC */}
          {activeTab === "medications" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Lịch Trình Thuốc</h2>
                  <p className="text-[11px] text-slate-500">Tổng cộng {medications.length} cữ nhắc</p>
                </div>

                <button
                  onClick={() => setShowAddMedForm(!showAddMedForm)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-xs transition-all"
                >
                  {showAddMedForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{showAddMedForm ? "Đóng" : "Thêm Thuốc"}</span>
                </button>
              </div>

              {showAddMedForm && (
                <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-md space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-teal-600" />
                    <span>Thêm cữ thuốc mới cho {currentFamily?.elder?.preferred_name || "cụ"}</span>
                  </h3>

                  <form onSubmit={handleAddMedication} className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Tên thuốc *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: Amlodipine 5mg"
                        value={newMedName}
                        onChange={(e) => setNewMedName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Giờ nhắc (24h) *</label>
                        <input
                          type="time"
                          required
                          value={newMedTime}
                          onChange={(e) => setNewMedTime(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Liều lượng *</label>
                        <input
                          type="text"
                          required
                          placeholder="1 viên"
                          value={newMedDosage}
                          onChange={(e) => setNewMedDosage(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Hướng dẫn cho cụ</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Uống sau khi ăn sáng với nước ấm"
                        value={newMedInstructions}
                        onChange={(e) => setNewMedInstructions(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                    >
                      Lên Lịch Nhắc Thuốc
                    </button>
                  </form>
                </div>
              )}

              {medications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                  Chưa có cữ thuốc nào được thiết lập. Hãy bấm "+ Thêm Thuốc" ở trên.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {medications.map((med) => (
                    <div
                      key={med.id}
                      className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          onClick={() => handleToggleTaken(med.id)}
                          className={`p-2 rounded-xl cursor-pointer transition-colors shrink-0 ${
                            med.is_taken ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                          title="Chạm để đổi trạng thái uống"
                        >
                          <Clock className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 truncate">{med.medicine_name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded-md font-semibold text-slate-700">
                              {med.time_str}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded-md font-semibold text-slate-700">
                              {med.dosage}
                            </span>
                          </div>

                          {med.note && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">{med.note}</p>
                          )}

                          <button
                            onClick={() => handleToggleTaken(med.id)}
                            className={`mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 transition-all ${
                              med.is_taken ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {med.is_taken ? <Check className="w-2.5 h-2.5" /> : null}
                            <span>{med.is_taken ? "Đã uống thuốc" : "Chưa uống (Chạm để tick)"}</span>
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteMedication(med.id)}
                        className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                        title="Xóa cữ thuốc"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: KÝ ỨC (RAG) */}
          {activeTab === "memories" && (
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm ngữ nghĩa ký ức của cụ..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearchMemory()}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <button
                    onClick={handleSearchMemory}
                    className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-xs"
                  >
                    Tìm
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 space-y-2">
                    <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                      Kết quả tương đồng nhất:
                    </div>
                    {searchResults.map((res, i) => (
                      <div key={i} className="bg-white p-2.5 rounded-xl border border-teal-100 text-xs text-slate-800">
                        <div className="text-[10px] font-semibold text-teal-700 mb-0.5">
                          Độ khớp: {Math.round((res.similarity || 0.85) * 100)}%
                        </div>
                        {res.memory?.content || res.content}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Ký Ức Gia Đình</h2>
                  <p className="text-[11px] text-slate-500">Được bảo mật riêng cho {currentFamily?.family_name}</p>
                </div>

                <button
                  onClick={() => setShowAddMemoryForm(!showAddMemoryForm)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-xs transition-all"
                >
                  {showAddMemoryForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{showAddMemoryForm ? "Đóng" : "Nạp Ký Ức"}</span>
                </button>
              </div>

              {showAddMemoryForm && (
                <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-md space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-teal-600" />
                    <span>Nạp mẩu chuyện mới cho {currentFamily?.elder?.preferred_name || "cụ"}</span>
                  </h3>

                  <form onSubmit={handleAddMemory} className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Chủ đề</label>
                        <select
                          value={newMemoryTag}
                          onChange={(e) => setNewMemoryTag(e.target.value)}
                          className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="Gia đình">Gia đình & Con cháu</option>
                          <option value="Quê quán">Quê quán & Thời trẻ</option>
                          <option value="Sở thích">Sở thích & Thói quen</option>
                          <option value="Sức khỏe">Sức khỏe & Bệnh nền</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Tiêu đề</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Nghề dạy học"
                          value={newMemorySubject}
                          onChange={(e) => setNewMemorySubject(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Nội dung chi tiết *</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Kể lại mẩu chuyện để AI ghi nhớ và nhắc lại với cụ lúc trò chuyện..."
                        value={newMemoryContent}
                        onChange={(e) => setNewMemoryContent(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                    >
                      Lưu & Vector Hóa Ký Ức
                    </button>
                  </form>
                </div>
              )}

              {memories.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                  Chưa có ký ức nào được nạp. Nhấn "Nạp Ký Ức" để bắt đầu lưu trữ câu chuyện gia đình.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {memories.map((mem) => (
                    <div key={mem.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <div className="flex flex-wrap gap-1">
                          {mem.tags?.map((t: string, idx: number) => (
                            <span key={idx} className="text-[10px] px-1.5 py-0.2 rounded-md bg-teal-50 text-teal-800 font-semibold border border-teal-100">
                              {t}
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {mem.created_at ? new Date(mem.created_at).toLocaleDateString("vi-VN") : "Gần đây"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed">{mem.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SOS KHẨN CẤP */}
          {activeTab === "sos" && (
            <div className="space-y-3">
              {sosLogs.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 shadow-xs">
                  <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Người thân đang an toàn!</div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">
                      Không phát hiện triệu chứng nguy hiểm hoặc báo động SOS nào trong hôm nay.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-900 shadow-xs animate-pulse">
                  <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Có {sosLogs.length} sự cố cảnh báo SOS!</div>
                    <div className="text-[11px] text-red-700 mt-0.5">
                      Vui lòng kiểm tra chi tiết và liên hệ ngay với người thân hoặc 115.
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                {sosLogs.map((log, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-2xl border border-red-200 shadow-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-red-100 text-red-700">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-red-700">{log.reason || "Cảnh báo khẩn cấp"}</div>
                          <div className="text-[10px] text-slate-500">
                            Vị trí: <span className="font-semibold text-slate-700">{log.location || "Nhà ở"}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded-full uppercase">
                        {log.severity || "CRITICAL"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                      <span className="text-slate-400">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString("vi-VN") : "Vừa xong"}
                      </span>

                      <a
                        href={`tel:${currentFamily?.elder?.primary_caregiver_phone || "0900000000"}`}
                        className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-800 bg-teal-50 px-2 py-1 rounded-lg border border-teal-200"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Gọi cho cụ ngay</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: HỒ SƠ */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900">Tài Khoản Gia Đình</div>
                  <button
                    onClick={() => {
                      setIsRegisterMode(false);
                      setIsFamilyModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-teal-700 hover:underline"
                  >
                    Đổi gia đình
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Tên gia đình:</span>
                    <span className="font-bold text-slate-800">{currentFamily?.family_name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Mã máy cụ:</span>
                    <span className="font-mono font-black text-teal-800">{currentFamily?.pairing_code}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">SĐT Quản trị:</span>
                    <span className="font-medium text-slate-800">{currentFamily?.admin_phone}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-teal-600" />
                    <span>Hồ Sơ & Danh Xưng Cho Gemini Live</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Hệ thống sẽ điều chỉnh prompt thời gian thực theo danh xưng và thông tin này.
                  </p>
                </div>

                {profileSuccessMsg && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-1.5 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveElderProfile} className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Họ tên đầy đủ *</label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1">
                    <label className="block text-[11px] font-bold text-teal-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Tên con cháu đặt cho AI (để cụ gọi đánh thức) *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: An Nhiên, Cháu Út, Bé Bảy"
                      value={editAiName}
                      onChange={(e) => setEditAiName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-teal-300 text-xs font-semibold text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                    <p className="text-[10px] text-teal-700">
                      Cụ chỉ cần cất giọng: <span className="font-bold">"Cháu ơi"</span> hoặc <span className="font-bold">"{editAiName || "An Nhiên"} ơi"</span> để đánh thức trợ lý 100% rảnh tay.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Tên thường gọi *</label>
                      <input
                        type="text"
                        required
                        value={editPrefName}
                        onChange={(e) => setEditPrefName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Danh xưng AI gọi *</label>
                      <select
                        value={editHonorific}
                        onChange={(e) => setEditHonorific(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="Bác">Bác</option>
                        <option value="Bà">Bà</option>
                        <option value="Ông">Ông</option>
                        <option value="Cụ">Cụ</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Năm sinh *</label>
                      <input
                        type="number"
                        required
                        min={1910}
                        max={1970}
                        value={editBirthYear}
                        onChange={(e) => setEditBirthYear(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">SĐT Con cháu *</label>
                      <input
                        type="tel"
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Quê quán / Địa chỉ</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Lưu ý sức khỏe / Bệnh nền</label>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu Hồ Sơ Cụ</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>

        {/* ==================================================== */}
        {/* FIXED BOTTOM NAVIGATION BAR (MOBILE APP STANDARD)   */}
        {/* ==================================================== */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
          <button
            onClick={() => setActiveTab("wellbeing")}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
              activeTab === "wellbeing" ? "text-teal-700 font-bold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${activeTab === "wellbeing" ? "bg-teal-50" : ""}`}>
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">An Sinh</span>
          </button>

          <button
            onClick={() => setActiveTab("medications")}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl relative transition-all ${
              activeTab === "medications" ? "text-teal-700 font-bold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${activeTab === "medications" ? "bg-teal-50" : ""}`}>
              <Pill className="w-5 h-5" />
            </div>
            {medications.length > 0 && (
              <span className="absolute top-0.5 right-3 bg-teal-600 text-white text-[9px] font-bold px-1.5 rounded-full leading-tight">
                {medications.length}
              </span>
            )}
            <span className="text-[10px] mt-0.5">Đơn Thuốc</span>
          </button>

          <button
            onClick={() => setActiveTab("memories")}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl relative transition-all ${
              activeTab === "memories" ? "text-teal-700 font-bold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${activeTab === "memories" ? "bg-teal-50" : ""}`}>
              <Brain className="w-5 h-5" />
            </div>
            {memories.length > 0 && (
              <span className="absolute top-0.5 right-3 bg-blue-600 text-white text-[9px] font-bold px-1.5 rounded-full leading-tight">
                {memories.length}
              </span>
            )}
            <span className="text-[10px] mt-0.5">Ký Ức</span>
          </button>

          <button
            onClick={() => setActiveTab("sos")}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl relative transition-all ${
              activeTab === "sos" ? "text-red-700 font-bold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${activeTab === "sos" ? "bg-red-50" : ""}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            {sosLogs.length > 0 && (
              <span className="absolute top-0.5 right-3 bg-red-600 text-white text-[9px] font-bold px-1.5 rounded-full animate-pulse leading-tight">
                {sosLogs.length}
              </span>
            )}
            <span className="text-[10px] mt-0.5">SOS</span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
              activeTab === "profile" ? "text-teal-700 font-bold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${activeTab === "profile" ? "bg-teal-50" : ""}`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">Hồ Sơ</span>
          </button>
        </nav>

        {/* ==================================================== */}
        {/* MODAL: SWITCH / REGISTER FAMILY                     */}
        {/* ==================================================== */}
        {isFamilyModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-teal-600" />
                  <span>{isRegisterMode ? "Đăng Ký Gia Đình Mới" : "Chọn Tài Khoản Gia Đình"}</span>
                </h3>
                <button
                  onClick={() => setIsFamilyModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {!isRegisterMode ? (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-500">
                    Mỗi gia đình có một mã kết nối riêng biệt:
                  </p>

                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {families.map((fam) => (
                      <div
                        key={fam.id}
                        onClick={() => {
                          selectFamily(fam);
                          setIsFamilyModalOpen(false);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          currentFamily?.id === fam.id
                            ? "border-teal-500 bg-teal-50/70"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{fam.family_name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Cụ: <span className="font-semibold text-slate-700">{fam.elder?.preferred_name || "Chưa đặt"}</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-md bg-teal-100 text-teal-900">
                          {fam.pairing_code}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsRegisterMode(true)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Đăng Ký Gia Đình Mới</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterFamily} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Tên Đăng Nhập *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: giadinh_ba"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Mật Khẩu *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: 123456"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Tên Gia Đình *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Gia Đình Bà Năm"
                      value={regFamilyName}
                      onChange={(e) => setRegFamilyName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Họ tên cụ *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nguyễn Thị Năm"
                        value={regElderFullName}
                        onChange={(e) => setRegElderFullName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Tên gọi nhà *</label>
                      <input
                        type="text"
                        required
                        placeholder="Bà Năm"
                        value={regElderPrefName}
                        onChange={(e) => setRegElderPrefName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Tên con cháu đặt cho AI (để cụ gọi đánh thức) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: An Nhiên, Cháu Út, Bé Bảy"
                      value={regAiName}
                      onChange={(e) => setRegAiName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Danh xưng *</label>
                      <select
                        value={regHonorific}
                        onChange={(e) => setRegHonorific(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="Bà">Bà</option>
                        <option value="Ông">Ông</option>
                        <option value="Bác">Bác</option>
                        <option value="Cụ">Cụ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Năm sinh *</label>
                      <input
                        type="number"
                        required
                        value={regBirthYear}
                        onChange={(e) => setRegBirthYear(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">SĐT Con cháu *</label>
                    <input
                      type="tel"
                      required
                      placeholder="0912345678"
                      value={regAdminPhone}
                      onChange={(e) => setRegAdminPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Quê quán / Địa chỉ</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 128 Lê Lợi, Bến Tre..."
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Lưu ý sức khỏe ban đầu (nếu có)</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Huyết áp, tiểu đường..."
                      value={regMedicalNotes}
                      onChange={(e) => setRegMedicalNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(false)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                    >
                      Quay lại
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs"
                    >
                      Tạo Tài Khoản
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
