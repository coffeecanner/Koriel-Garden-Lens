import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  Plus, 
  Trash2, 
  Edit, 
  Upload, 
  Camera, 
  RefreshCw, 
  Search, 
  Lock, 
  User as UserIcon,
  Users,
  Menu,
  Database,
  Flower2,
  FileSpreadsheet,
  Phone,
  Calendar,
  X,
  FileText,
  Eye,
  BookOpen
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import { 
  User, 
  AdminModel, 
  StaffModel, 
  KonsumenModel, 
  GambarBungaTropisModel, 
  HasilSinkronisasiModel, 
  HasilIdentifikasiModel, 
  LaporanModel 
} from "./types";
const API_BASE_URL = (
  (import.meta as any).env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");
import logo from "./logo.png";

const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
export default function App() {
  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentMenu, setCurrentMenu] = useState<string>("Dashboard Utama");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Global Lists States
  const [adminsList, setAdminsList] = useState<AdminModel[]>([]);
  const [staffList, setStaffList] = useState<StaffModel[]>([]);
  const [konsumenList, setKonsumenList] = useState<KonsumenModel[]>([]);
  const [gambarList, setGambarList] = useState<GambarBungaTropisModel[]>([]);
  const [hasilList, setHasilList] = useState<HasilIdentifikasiModel[]>([]);
  const [sinkronisasiList, setSinkronisasiList] = useState<HasilSinkronisasiModel[]>([]);
  const [laporanList, setLaporanList] = useState<LaporanModel[]>([]);

  // Feedback State
  const [bannerAlert, setBannerAlert] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Form states
  const [adminForm, setAdminForm] = useState({ id_admin: 0, username: "", password: "", nama_admin: "" });
  const [isAdminFormOpen, setIsAdminFormOpen] = useState(false);
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);

  const [staffForm, setStaffForm] = useState({ id_staff: 0, username: "", password: "", nama_staff: "", no_telp_staff: "", id_admin: 0 });
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [isEditingStaff, setIsEditingStaff] = useState(false);

  const [konsumenForm, setKonsumenForm] = useState({ id_konsumen: 0, nama_konsumen: "", no_telp_konsumen: "", id_staff: 0 });
  const [isKonsumenFormOpen, setIsKonsumenFormOpen] = useState(false);
  const [isEditingKonsumen, setIsEditingKonsumen] = useState(false);

  const [laporanForm, setLaporanForm] = useState({ file_dokumen: "Laporan_Bunga_Tropis_S2_2026.xlsx", id_sinkronisasi: 0 });
  const [isLaporanFormOpen, setIsLaporanFormOpen] = useState(false);

  // Identification Workflow State
  const [selectedKonsumenId, setSelectedKonsumenId] = useState<string>("");
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string>("");
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [lastIdentificationResult, setLastIdentificationResult] = useState<HasilIdentifikasiModel | null>(null);

  // Inline Consumer Form & Drag & Drop States
  const [isInlineKonsumenFormOpen, setIsInlineKonsumenFormOpen] = useState(false);
  const [inlineNamaKonsumen, setInlineNamaKonsumen] = useState("");
  const [inlineNoTelpKonsumen, setInlineNoTelpKonsumen] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  // Detail & Edit Species State
  const [selectedSpeciesForDetail, setSelectedSpeciesForDetail] = useState<HasilSinkronisasiModel | null>(null);
  const [carouselActiveIndex, setCarouselActiveIndex] = useState<number>(0);
  const [selectedIdentifikasiDetail, setSelectedIdentifikasiDetail] = useState<HasilIdentifikasiModel | null>(null);
  const [selectedGambarFotoUrl, setSelectedGambarFotoUrl] = useState<string | null>(null);

  // Laporan Filters and Creation States
  const [filterLaporanBulan, setFilterLaporanBulan] = useState<string>("ALL");
  const [filterLaporanTahun, setFilterLaporanTahun] = useState<string>("ALL");
  const [laporanBulan, setLaporanBulan] = useState<number>(new Date().getMonth() + 1);
  const [laporanTahun, setLaporanTahun] = useState<number>(new Date().getFullYear());

  // Custom Cascade Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: "admin" | "staff" | "konsumen" | "gambar" | "hasil" | "laporan";
    id: number;
    title: string;
    details: string[];
    onConfirm: () => void;
  } | null>(null);

  const [selectedSpeciesForEdit, setSelectedSpeciesForEdit] = useState<HasilSinkronisasiModel | null>(null);
  const [editCharacteristicsText, setEditCharacteristicsText] = useState("");

  const handleUpdateSpeciesCharacteristics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpeciesForEdit) return;
    
    const headers = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    };
    try {
      const res = await fetch(apiUrl("/api/hasil_sinkronisasi"), {
        method: "PUT",
        headers,
        body: JSON.stringify({
          id_sinkronisasi: selectedSpeciesForEdit.id_sinkronisasi,
          karakteristik_perawatan: editCharacteristicsText
        })
      });
      if (res.ok) {
        triggerAlert("success", "Karakteristik & cara perawatan berhasil diperbarui.");
        setSelectedSpeciesForEdit(null);
        fetchAllData();
        // Update detail modal state if it matches
        if (selectedSpeciesForDetail && selectedSpeciesForDetail.id_sinkronisasi === selectedSpeciesForEdit.id_sinkronisasi) {
          setSelectedSpeciesForDetail({
            ...selectedSpeciesForDetail,
            karakteristik_perawatan: editCharacteristicsText
          });
        }
      } else {
        const err = await res.json();
        triggerAlert("error", err.message || "Gagal memperbarui karakteristik.");
      }
    } catch {
      triggerAlert("error", "Error koneksi.");
    }
  };

  // Camera handler
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  const triggerAlert = (type: "success" | "error", text: string) => {
    setBannerAlert({ type, text });
    setTimeout(() => setBannerAlert(null), 4000);
  };

  const fetchAllData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const headers = { "Authorization": `Bearer ${token}` };

    const endpoints = [
      { url: apiUrl("/api/admin"), setter: setAdminsList, name: "Admin" },
      { url: apiUrl("/api/staff"), setter: setStaffList, name: "Staff" },
      { url: apiUrl("/api/konsumen"), setter: setKonsumenList, name: "Konsumen" },
      {
        url: apiUrl("/api/gambar_bunga_tropis"),
        setter: setGambarList,
        name: "Gambar",
      },
      {
        url: apiUrl("/api/hasil_identifikasi"),
        setter: setHasilList,
        name: "Hasil Identifikasi",
      },
      {
        url: apiUrl("/api/hasil_sinkronisasi"),
        setter: setSinkronisasiList,
        name: "Hasil Sinkronisasi",
      },
      { url: apiUrl("/api/laporan"), setter: setLaporanList, name: "Laporan" },
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep.url, { headers });
        if (res.ok) {
          const data = await res.json();
          ep.setter(data);
        } else {
          let errorMsg = `HTTP ${res.status}`;
          try {
            const errData = await res.json();
            if (errData && errData.message) {
              errorMsg = errData.message;
            }
          } catch {}
          console.error(`Gagal sinkronisasi data ${ep.name} dari Flask backend: ${errorMsg}`);
          triggerAlert("error", `Gagal memuat data ${ep.name}: ${errorMsg}`);
        }
      } catch (err: any) {
        console.error(`Error koneksi ke endpoint ${ep.url}:`, err);
        triggerAlert("error", `Koneksi gagal ke ${ep.name} (${ep.url})`);
      }
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchAllData();
    }
  }, [currentUser]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsAuthenticating(true);
    try {
      const requestUrl = apiUrl("/api/auth/login");
      console.log("Login API URL:", requestUrl);

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      const contentType = response.headers.get("content-type");
      const responseData = contentType?.includes("application/json")
        ? await response.json()
        : { message: await response.text() };

      if (!response.ok) {
        throw new Error(
          responseData.message ||
            `Login gagal. Server mengembalikan HTTP ${response.status}.`
        );
      }

      if (!responseData.token || !responseData.user) {
        throw new Error("Respons login tidak memiliki token atau data pengguna.");
      }

      localStorage.setItem("token", responseData.token);
      localStorage.setItem("user", JSON.stringify(responseData.user));

      setCurrentUser(responseData.user);
      triggerAlert("success", `Selamat Datang, ${responseData.user.name}!`);
    } catch (err) {
      console.error("Login error:", err);
      setLoginError(
        err instanceof Error
          ? err.message
          : "Gagal menghubungkan ke backend."
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentUser(null);
    setLastIdentificationResult(null);
    setUploadedImageBase64("");
    setSelectedKonsumenId("");
    setCurrentMenu("Dashboard Utama");
    triggerAlert("success", "Berhasil keluar dari sesi.");
  };

  // --- CRUD ADMIN ---
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    };
    try {
      const url = apiUrl("/api/admin");
      const method = isEditingAdmin ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(adminForm)
      });
      if (res.ok) {
        triggerAlert("success", `Admin berhasil ${isEditingAdmin ? "diperbarui" : "ditambahkan"}`);
        // Synchronize logged-in user profile if it is the current user editing their own admin profile
        if (isEditingAdmin && currentUser?.role === "ADMIN" && adminForm.id_admin === currentUser.id_admin) {
          const updatedUser = {
            ...currentUser,
            username: adminForm.username,
            name: adminForm.nama_admin
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
        }
        setIsAdminFormOpen(false);
        setIsEditingAdmin(false);
        setAdminForm({ id_admin: 0, username: "", password: "", nama_admin: "" });
        fetchAllData();
      } else {
        const error = await res.json();
        triggerAlert("error", error.message || "Gagal memproses admin.");
      }
    } catch {
      triggerAlert("error", "Error koneksi.");
    }
  };

  const handleDeleteAdmin = (id: number) => {
    if (currentUser?.role === "ADMIN" && currentUser?.id_admin === id) {
      triggerAlert("error", "Anda tidak diperbolehkan menghapus akun Anda sendiri yang sedang aktif!");
      return;
    }
    const adm = adminsList.find(a => a.id_admin === id);
    const name = adm ? adm.nama_admin : `#${id}`;
    
    setDeleteConfirmation({
      type: "admin",
      id,
      title: `Hapus Akun Admin: ${name}?`,
      details: [
        "Semua akun Staff yang didaftarkan oleh Admin ini akan ikut terhapus secara otomatis.",
        "Semua Laporan Hasil Identifikasi yang digenerate oleh Admin ini akan ikut terhapus.",
        "Semua data Gambar Bunga Tropis, Hasil Identifikasi, dan data Konsumen terkait Staff tersebut akan terhapus secara permanen dari database."
      ],
      onConfirm: async () => {
        try {
          const res = await fetch(apiUrl(`/api/admin?id_admin=${id}`), {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
          });
          if (res.ok) {
            triggerAlert("success", "Admin berhasil dihapus.");
            setDeleteConfirmation(null);
            fetchAllData();
          } else {
            const err = await res.json();
            triggerAlert("error", err.message || "Gagal menghapus admin.");
          }
        } catch {
          triggerAlert("error", "Error koneksi.");
        }
      }
    });
  };

  // --- CRUD STAFF ---
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    };
    try {
      const url = apiUrl("/api/staff");
      const method = isEditingStaff ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(staffForm)
      });
      if (res.ok) {
        triggerAlert("success", `Staff berhasil ${isEditingStaff ? "diperbarui" : "ditambahkan"}`);
        // Synchronize logged-in user profile if it is the current user editing their own staff profile
        if (isEditingStaff && currentUser?.role === "STAFF" && staffForm.id_staff === currentUser.id_staff) {
          const updatedUser = {
            ...currentUser,
            username: staffForm.username,
            name: staffForm.nama_staff
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
        }
        setIsStaffFormOpen(false);
        setIsEditingStaff(false);
        setStaffForm({ id_staff: 0, username: "", password: "", nama_staff: "", no_telp_staff: "", id_admin: 0 });
        fetchAllData();
      } else {
        const err = await res.json();
        triggerAlert("error", err.message || "Gagal memproses staff.");
      }
    } catch {
      triggerAlert("error", "Error koneksi.");
    }
  };

  const handleDeleteStaff = (id: number) => {
    const stf = staffList.find(s => s.id_staff === id);
    const name = stf ? stf.nama_staff : `#${id}`;
    
    setDeleteConfirmation({
      type: "staff",
      id,
      title: `Hapus Akun Staff: ${name}?`,
      details: [
        "Semun Gambar Bunga Tropis yang diunggah oleh Staff ini akan ikut terhapus otomatis.",
        "Semua Hasil Identifikasi yang bersumber dari foto unggahan Staff ini akan ikut terhapus.",
        "Semua data Konsumen yang dilayani oleh Staff ini akan ikut terhapus secara permanen.",
        "Semua Laporan yang dibuat oleh Staff ini akan dihapus secara permanen dari daftar."
      ],
      onConfirm: async () => {
        try {
          const res = await fetch(apiUrl(`/api/staff?id_staff=${id}`), {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
          });
          if (res.ok) {
            triggerAlert("success", "Staff berhasil dihapus.");
            setDeleteConfirmation(null);
            fetchAllData();
          } else {
            const err = await res.json();
            triggerAlert("error", err.message || "Gagal menghapus staff.");
          }
        } catch {
          triggerAlert("error", "Error koneksi.");
        }
      }
    });
  };

  // --- CRUD KONSUMEN ---
  const handleSaveKonsumen = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    };
    try {
      const url = apiUrl("/api/konsumen");
      const method = isEditingKonsumen ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(konsumenForm)
      });
      if (res.ok) {
        triggerAlert("success", `Konsumen berhasil ${isEditingKonsumen ? "diperbarui" : "didaftarkan"}`);
        setIsKonsumenFormOpen(false);
        setIsEditingKonsumen(false);
        setKonsumenForm({ id_konsumen: 0, nama_konsumen: "", no_telp_konsumen: "", id_staff: 0 });
        fetchAllData();
      } else {
        const err = await res.json();
        triggerAlert("error", err.message || "Gagal memproses data konsumen.");
      }
    } catch {
      triggerAlert("error", "Error koneksi.");
    }
  };

  const handleDeleteKonsumen = (id: number) => {
    const cons = konsumenList.find(c => c.id_konsumen === id);
    const name = cons ? cons.nama_konsumen : `#${id}`;
    
    setDeleteConfirmation({
      type: "konsumen",
      id,
      title: `Hapus Data Konsumen: ${name}?`,
      details: [
        "Data pendaftaran konsumen ini akan dihapus secara permanen dari sistem.",
        "Hal ini tidak akan memengaruhi data identifikasi botani yang sudah tersinkronisasi."
      ],
      onConfirm: async () => {
        try {
          const res = await fetch(apiUrl(`/api/konsumen?id_konsumen=${id}`), {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
          });
          if (res.ok) {
            triggerAlert("success", "Konsumen berhasil dihapus.");
            setDeleteConfirmation(null);
            fetchAllData();
          }
        } catch {
          triggerAlert("error", "Error koneksi.");
        }
      }
    });
  };

  // --- CRUD LAPORAN ---
  const handleSaveLaporan = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    };
    try {
      // Build ISO date string representing the selected month & year
      const customDate = `${laporanTahun}-${String(laporanBulan).padStart(2, "0")}-01T00:00:00Z`;
      
      const res = await fetch(apiUrl("/api/laporan"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...laporanForm,
          tanggal_laporan: customDate
        })
      });
      if (res.ok) {
        triggerAlert("success", "Dokumen laporan baru berhasil dibuat.");
        setIsLaporanFormOpen(false);
        fetchAllData();
      } else {
        const err = await res.json();
        triggerAlert("error", err.message || "Gagal membuat laporan.");
      }
    } catch {
      triggerAlert("error", "Error koneksi.");
    }
  };

  const handleDeleteLaporan = (id: number) => {
    const lap = laporanList.find(l => l.id_laporan === id);
    const name = lap ? lap.file_dokumen : `#${id}`;
    
    setDeleteConfirmation({
      type: "laporan",
      id,
      title: `Hapus Laporan: ${name}?`,
      details: [
        "Berkas laporan bulanan ini akan dihapus secara permanen dari daftar riwayat arsip.",
        "Hal ini tidak akan memengaruhi log data hasil identifikasi atau data master botani."
      ],
      onConfirm: async () => {
        try {
          const res = await fetch(apiUrl(`/api/laporan?id_laporan=${id}`), {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
          });
          if (res.ok) {
            triggerAlert("success", "Laporan berhasil dihapus.");
            setDeleteConfirmation(null);
            fetchAllData();
          }
        } catch {
          triggerAlert("error", "Error koneksi.");
        }
      }
    });
  };

  const handleDownloadLaporan = async (id_laporan: number, filename: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl(`/api/laporan/download?id_laporan=${id_laporan}`), {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        triggerAlert("error", "Gagal mengunduh laporan.");
        return;
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanFilename = filename.replace(".xlsx", ".xls").replace(".csv", ".xls").replace(".xls.xls", ".xls");
      a.download = cleanFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      triggerAlert("success", "Unduhan laporan berhasil dimulai!");
    } catch (err) {
      console.error(err);
      triggerAlert("error", "Error koneksi saat mengunduh.");
    }
  };

  // --- SINKRONISASI KAGGLE FLOW ---
  const handleTriggerSync = async () => {
    const headers = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    };
    try {
      triggerAlert("success", "Menghubungkan ke Kaggle dataset...");
      const res = await fetch(apiUrl("/api/hasil_sinkronisasi"), {
        method: "POST",
        headers
      });
      if (res.ok) {
        const data = await res.json();
        triggerAlert("success", `Kaggle Sync Berhasil! Menyinkronkan ${data.synced_count} data karakteristik.`);
        fetchAllData();
      } else {
        triggerAlert("error", "Gagal melakukan sinkronisasi Kaggle.");
      }
    } catch {
      triggerAlert("error", "Koneksi terputus.");
    }
  };

  // --- UPLOAD / CAM LOGIC ---
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      triggerAlert("error", "Format berkas tidak valid! Harap unggah file foto (JPG/PNG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImageBase64(reader.result as string);
      triggerAlert("success", "Foto bunga tropis berhasil dimuat dan divalidasi lewat drop!");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveInlineKonsumen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineNamaKonsumen.trim()) {
      triggerAlert("error", "Nama konsumen tidak boleh kosong!");
      return;
    }
    if (!inlineNoTelpKonsumen.trim()) {
      triggerAlert("error", "Nomor telepon konsumen tidak boleh kosong!");
      return;
    }
    const headers = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    };
    try {
      const url = apiUrl("/api/konsumen");
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          nama_konsumen: inlineNamaKonsumen,
          no_telp_konsumen: inlineNoTelpKonsumen,
          id_staff: staffList[0]?.id_staff || 1
        })
      });
      if (res.ok) {
        const data = await res.json();
        triggerAlert("success", "Konsumen baru berhasil didaftarkan secara inline!");
        setInlineNamaKonsumen("");
        setInlineNoTelpKonsumen("");
        setIsInlineKonsumenFormOpen(false);
        if (data && data.id_konsumen) {
          setSelectedKonsumenId(String(data.id_konsumen));
        }
        fetchAllData();
      } else {
        const err = await res.json();
        triggerAlert("error", err.message || "Gagal mendaftarkan konsumen.");
      }
    } catch {
      triggerAlert("error", "Error koneksi.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: format and size
    if (!file.type.startsWith("image/")) {
      triggerAlert("error", "Format berkas tidak valid! Harap unggah file foto (JPG/PNG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImageBase64(reader.result as string);
      triggerAlert("success", "Foto bunga tropis berhasil dimuat dan divalidasi!");
    };
    reader.readAsDataURL(file);
  };

  // Activate Camera
  const startCamera = async () => {
    setIsCameraActive(true);
    setUploadedImageBase64("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      triggerAlert("error", "Gagal mengakses kamera perangkat.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setUploadedImageBase64(dataUrl);
        stopCamera();
        triggerAlert("success", "Berhasil mengambil gambar bunga tropis!");
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  // --- CNN MOBILENETV3 PREDICTION CALL ---
  const handleIdentifyFlower = async () => {
    if (!selectedKonsumenId) {
      triggerAlert("error", "Silakan pilih nama Konsumen terlebih dahulu!");
      return;
    }
    if (!uploadedImageBase64) {
      triggerAlert("error", "Harap unggah atau ambil foto bunga tropis terlebih dahulu!");
      return;
    }

    setIsIdentifying(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/predict"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          image: uploadedImageBase64,
          id_konsumen: parseInt(selectedKonsumenId)
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLastIdentificationResult(data.hasil_identifikasi);
        triggerAlert("success", "Sistem CNN MobileNetV3 berhasil mengidentifikasi kelas bunga!");
        fetchAllData();
      } else {
        const err = await res.json();
        triggerAlert("error", err.message || "Gagal melakukan identifikasi.");
      }
    } catch {
      triggerAlert("error", "Koneksi ke backend bermasalah.");
    } finally {
      setIsIdentifying(false);
    }
  };

  // --- RENDER TABLES SEARCH FILTER ---
  const applyFilter = (list: any[], searchKey: string) => {
    if (!searchTerm) return list;
    return list.filter(item => 
      Object.values(item).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  // Unauthenticated screen
  if (!currentUser) {
    return (
      <div id="login-container" className="min-h-screen bg-slate-50 text-slate-800 font-sans flex items-center justify-center p-4 relative overflow-hidden select-none">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-emerald-100/50 blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-teal-100/50 blur-3xl"></div>
        </div>

        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl relative z-10 text-left">
          <div className="text-center mb-8">
            <div className="mx-auto mb-3 w-20 h-20 bg-emerald-50 rounded-2xl border border-emerald-100/80 overflow-hidden flex items-center justify-center">
            <img src={logo} alt="Koriel Garden Logo" className="w-16 h-16 object-contain" />
          </div>
            <h1 className="text-2xl font-bold font-serif tracking-tight text-slate-900">Koriel Garden</h1>
            <p className="text-xs text-slate-500 mt-1 font-sans">Sistem Identifikasi & Pelayanan Pelanggan</p>
          </div>

          {loginError && (
            <div className="mb-4 bg-rose-50 border border-rose-100 rounded-xl p-3 flex space-x-2 text-rose-700 text-xs items-center justify-start">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Username Staff / Admin</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input 
                  type="text" required
                  placeholder="admin atau staff"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Kata Sandi</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input 
                  type="password" required
                  placeholder="admin123 atau staff123"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Masuk Sistem</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-800 font-sans">
      {/* Dynamic Sidebar */}
      <Sidebar 
        currentMenu={currentMenu} 
        setCurrentMenu={(menu) => {
          setCurrentMenu(menu);
          setSearchTerm("");
        }} 
        user={currentUser} 
        onLogout={handleLogout} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
        <header className="h-16 border-b border-slate-100 bg-white px-4 sm:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden cursor-pointer"
              title="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{currentMenu}</span>
          </div>

          <div className="flex items-center space-x-4">
            {bannerAlert && (
              <div 
                className={`flex items-center space-x-2 py-1 px-3.5 rounded-lg text-xs font-semibold border ${
                  bannerAlert.type === "success" 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100/80" 
                    : "bg-rose-50 text-rose-700 border-rose-100"
                }`}
              >
                {bannerAlert.type === "success" ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>{bannerAlert.text}</span>
              </div>
            )}
            <div className="text-[10px] bg-slate-50 border border-slate-200/60 py-1 px-2.5 rounded text-slate-500 font-mono">
              2026-07-08
            </div>
          </div>
        </header>

        {/* Inner Content Area */}
        <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6 flex-1 text-left">
          
          {/* ================= 1. MENU: DASHBOARD UTAMA ================= */}
          {currentMenu === "Dashboard Utama" && (
            <div className="space-y-6">
              
              {/* Introduction Banner */}
              <div className="p-6 bg-emerald-50/60 border border-emerald-100/70 rounded-2xl text-slate-800">
                <h2 className="text-lg font-bold font-serif text-emerald-950">Selamat datang di Koriel Garden, {currentUser.name}!</h2>
                <p className="text-xs text-emerald-800/90 mt-1 max-w-2xl">
                  Sistem layanan pintar untuk mengenali jenis bunga koleksi kami. Ambil atau unggah foto bunga konsumen, dapatkan hasil identifikasi spesies dengan cepat, dan sinkronkan data referensi botani secara real-time.
                </p>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Staff Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center space-x-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Jumlah Pegawai</span>
                    <span className="text-xl font-extrabold text-slate-900">{staffList.length} orang</span>
                  </div>
                </div>

                {/* Konsumen Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center space-x-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Konsumen</span>
                    <span className="text-xl font-extrabold text-slate-900">{konsumenList.length} terdaftar</span>
                  </div>
                </div>

                {/* Hasil Identifikasi Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center space-x-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Jumlah Identifikasi</span>
                    <span className="text-xl font-extrabold text-slate-900">{hasilList.length} kali</span>
                  </div>
                </div>

                {/* Spesies Bunga Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center space-x-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Flower2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Bunga Tropis Dikenali</span>
                    <span className="text-xl font-extrabold text-slate-900">{sinkronisasiList.length || 15} spesies</span>
                  </div>
                </div>
              </div>

              {/* Identification Workspace & Interactive Kamera / Upload */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Panel 1: Kamera & Form Unggah */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-950 font-serif border-b pb-2 flex items-center space-x-2">
                    <Flower2 className="w-5 h-5 text-emerald-600" />
                    <span>Ambil / Unggah Foto Bunga</span>
                  </h3>

                  {/* Konsumen Selector (Wajib diisi sesuai alur) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700">Pilih Konsumen Pemilik Gambar *</label>
                      <button
                        type="button"
                        onClick={() => setIsInlineKonsumenFormOpen(!isInlineKonsumenFormOpen)}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center space-x-1"
                      >
                        <span>{isInlineKonsumenFormOpen ? "✕ Batal" : "+ Tambah Customer"}</span>
                      </button>
                    </div>
                    <select
                      value={selectedKonsumenId}
                      onChange={(e) => setSelectedKonsumenId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Pilih Konsumen --</option>
                      {konsumenList.map((k) => (
                        <option key={k.id_konsumen} value={k.id_konsumen}>
                          {k.nama_konsumen} ({k.no_telp_konsumen})
                        </option>
                      ))}
                    </select>

                    {isInlineKonsumenFormOpen && (
                      <form onSubmit={handleSaveInlineKonsumen} className="mt-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-3">
                        <div className="text-[11px] font-bold text-emerald-800">Pendaftaran Konsumen Baru</div>
                        <div>
                          <input
                            type="text"
                            placeholder="Nama Konsumen *"
                            value={inlineNamaKonsumen}
                            onChange={(e) => setInlineNamaKonsumen(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="No. Telepon / WhatsApp *"
                            value={inlineNoTelpKonsumen}
                            onChange={(e) => setInlineNoTelpKonsumen(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                            required
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsInlineKonsumenFormOpen(false);
                              setInlineNamaKonsumen("");
                              setInlineNoTelpKonsumen("");
                            }}
                            className="p-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-semibold"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="p-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-semibold"
                          >
                            Simpan
                          </button>
                        </div>
                      </form>
                    )}

                    <p className="text-[10px] text-slate-500 mt-1">
                      Catatan: Daftarkan konsumen terlebih dahulu di menu <strong>Konsumen</strong> jika nama belum tertera.
                    </p>
                  </div>

                  {/* Camera Screen or Upload Image form */}
                  {isCameraActive ? (
                    <div className="relative overflow-hidden rounded-xl bg-black border border-slate-300 aspect-video flex flex-col justify-between">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <div className="absolute bottom-3 inset-x-0 flex justify-center space-x-2">
                        <button 
                          onClick={capturePhoto}
                          className="bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Ambil Gambar</span>
                        </button>
                        <button 
                          onClick={stopCamera}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-lg text-xs"
                        >
                          Tutup Kamera
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {uploadedImageBase64 ? (
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-50">
                          <img src={uploadedImageBase64} className="w-full h-full object-contain" alt="Preview Bunga" />
                          <button 
                            onClick={() => setUploadedImageBase64("")}
                            className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-full"
                            title="Hapus gambar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-3 transition-colors ${
                            isDragging 
                              ? "border-emerald-500 bg-emerald-50/50" 
                              : "border-slate-300 bg-slate-50 hover:bg-slate-100/50"
                          }`}
                        >
                          <Flower2 className={`w-10 h-10 transition-colors ${isDragging ? "text-emerald-500 animate-bounce" : "text-slate-400"}`} />
                          <div className="text-xs text-slate-600">
                            {isDragging ? "Lepaskan gambar untuk mengunggah!" : "Pilih atau Seret (Drag & Drop) foto bunga tropis di sini, atau aktifkan kamera"}
                          </div>
                          <div className="flex space-x-2">
                            <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-lg text-xs cursor-pointer flex items-center space-x-1.5">
                              <Upload className="w-4 h-4" />
                              <span>Unggah Foto</span>
                              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                            <button 
                              onClick={startCamera}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer"
                            >
                              <Camera className="w-4 h-4" />
                              <span>Buka Kamera</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <canvas ref={canvasRef} className="hidden" />

                  {/* Identify button */}
                  <button
                    onClick={handleIdentifyFlower}
                    disabled={isIdentifying || !uploadedImageBase64 || !selectedKonsumenId}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 cursor-pointer shadow-md transition-colors"
                  >
                    {isIdentifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Sedang Menganalisis Foto Bunga...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Kenali Jenis Bunga</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Panel 2: Hasil Identifikasi Terakhir & Detail */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-950 font-serif border-b pb-2 flex items-center space-x-2 mb-4">
                      <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                      <span>Hasil Analisis Jenis Bunga</span>
                    </h3>

                    {lastIdentificationResult ? (
                      <div className="space-y-4 text-left">
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-emerald-600 font-bold block uppercase tracking-wider">Spesies / Kelas Bunga</span>
                            <span className="text-lg font-bold text-emerald-950 font-serif">{lastIdentificationResult.label_kelas}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-emerald-600 font-bold block uppercase tracking-wider">Akurasi</span>
                            <span className="text-lg font-bold text-emerald-950">{(lastIdentificationResult.hasil_akurasi * 100).toFixed(2)}%</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Karakteristik & Deskripsi Tanaman:</span>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 border p-3 rounded-xl italic">
                            "{lastIdentificationResult.deskripsi_karakteristik}"
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] font-mono text-slate-500">
                          <div>ID Hasil: <span className="font-semibold text-slate-800">#{lastIdentificationResult.id_hasil}</span></div>
                          <div>Tanggal Identifikasi: <span className="font-semibold text-slate-800">{new Date(lastIdentificationResult.tanggal_identifikasi).toLocaleDateString()}</span></div>
                          <div>ID Gambar Terdaftar: <span className="font-semibold text-slate-800">#{lastIdentificationResult.id_gambar}</span></div>
                          <div>ID Sinkronisasi Referensi: <span className="font-semibold text-slate-800">{lastIdentificationResult.id_sinkronisasi ? `#${lastIdentificationResult.id_sinkronisasi}` : "Belum Sinkron"}</span></div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
                        <Flower2 className="w-8 h-8 mb-2 stroke-1 text-slate-300" />
                        <span>Belum ada hasil analisis identifikasi terbaru.</span>
                        <p className="text-[10px] mt-1 text-slate-400">Silakan lakukan identifikasi di panel sebelah kiri.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">Sistem Cerdas Koriel Garden</span>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ================= 2. MENU: ADMIN ================= */}
          {currentMenu === "Admin" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold font-serif text-slate-900">Admin</h2>
                  <p className="text-xs text-slate-500">Daftar akun administrator yang memiliki hak akses penuh dalam mengawasi sistem dan laporan.</p>
                </div>
                {currentUser.role === "ADMIN" && (
                  <button 
                    onClick={() => {
                      setIsEditingAdmin(false);
                      setAdminForm({ id_admin: 0, username: "", password: "", nama_admin: "" });
                      setIsAdminFormOpen(true);
                    }}
                    className="p-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Admin</span>
                  </button>
                )}
              </div>

              {/* Form Modal / Panel Admin */}
              {isAdminFormOpen && (
                <form onSubmit={handleSaveAdmin} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 max-w-xl">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-xs font-bold uppercase text-emerald-700">
                      {isEditingAdmin ? "Edit Admin" : "Tambah Admin Baru"}
                    </h3>
                    <button type="button" onClick={() => setIsAdminFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Username Admin</label>
                      <input 
                        type="text" required
                        value={adminForm.username}
                        onChange={(e) => setAdminForm({...adminForm, username: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Password Admin</label>
                      <input 
                        type="password" required
                        value={adminForm.password}
                        onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Nama Lengkap Admin</label>
                      <input 
                        type="text" required
                        value={adminForm.nama_admin}
                        onChange={(e) => setAdminForm({...adminForm, nama_admin: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button type="submit" className="p-2 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer">
                      Simpan Admin
                    </button>
                    <button type="button" onClick={() => setIsAdminFormOpen(false)} className="p-2 px-4 bg-white text-slate-700 border rounded-xl text-xs cursor-pointer">
                      Batal
                    </button>
                  </div>
                </form>
              )}

              {/* Data Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs text-slate-800 border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="p-3.5">ID Admin</th>
                      <th className="p-3.5">Username</th>
                      <th className="p-3.5">Kata Sandi</th>
                      <th className="p-3.5">Nama Admin</th>
                      {currentUser.role === "ADMIN" && <th className="p-3.5 text-right">Opsi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {adminsList.map((admin) => (
                      <tr key={admin.id_admin} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-emerald-700">#{admin.id_admin}</td>
                        <td className="p-3.5">{admin.username}</td>
                        <td className="p-3.5">••••••••</td>
                        <td className="p-3.5 font-sans">{admin.nama_admin}</td>
                        {currentUser.role === "ADMIN" && (
                          <td className="p-3.5 text-right space-x-2 font-sans">
                            <button 
                              onClick={() => {
                                setAdminForm({ id_admin: admin.id_admin, username: admin.username, password: "", nama_admin: admin.nama_admin });
                                setIsEditingAdmin(true);
                                setIsAdminFormOpen(true);
                              }}
                              className="text-emerald-600 hover:text-emerald-800"
                            >
                              <Edit className="w-4 h-4 inline" />
                            </button>
                            {currentUser?.id_admin !== admin.id_admin ? (
                              <button onClick={() => handleDeleteAdmin(admin.id_admin)} className="text-rose-600 hover:text-rose-800" title="Hapus Admin">
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Sesi Aktif</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= 3. MENU: STAFF ================= */}
          {currentMenu === "Staff" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold font-serif text-slate-900">Staff</h2>
                  <p className="text-xs text-slate-500">Daftar staff atau pegawai Koriel Garden yang bertugas melayani pengunjung dan mengidentifikasi bunga.</p>
                </div>
                {currentUser.role === "ADMIN" && (
                  <button 
                    onClick={() => {
                      setIsEditingStaff(false);
                      setStaffForm({ id_staff: 0, username: "", password: "", nama_staff: "", no_telp_staff: "", id_admin: adminsList[0]?.id_admin || 1 });
                      setIsStaffFormOpen(true);
                    }}
                    className="p-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Staff</span>
                  </button>
                )}
              </div>

              {isStaffFormOpen && (
                <form onSubmit={handleSaveStaff} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 max-w-xl">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-xs font-bold uppercase text-emerald-700">
                      {isEditingStaff ? "Edit Staff" : "Tambah Staff Baru"}
                    </h3>
                    <button type="button" onClick={() => setIsStaffFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Username Staff</label>
                      <input 
                        type="text" required
                        value={staffForm.username}
                        onChange={(e) => setStaffForm({...staffForm, username: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Password Staff</label>
                      <input 
                        type="password" required
                        value={staffForm.password}
                        onChange={(e) => setStaffForm({...staffForm, password: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Nama Lengkap Staff</label>
                      <input 
                        type="text" required
                        value={staffForm.nama_staff}
                        onChange={(e) => setStaffForm({...staffForm, nama_staff: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">No. Telp Staff</label>
                      <input 
                        type="text" required
                        value={staffForm.no_telp_staff}
                        onChange={(e) => setStaffForm({...staffForm, no_telp_staff: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Admin Pengawas</label>
                      <select 
                        value={staffForm.id_admin}
                        onChange={(e) => setStaffForm({...staffForm, id_admin: parseInt(e.target.value)})}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                      >
                        {adminsList.map((a) => (
                          <option key={a.id_admin} value={a.id_admin}>{a.nama_admin} (ID #{a.id_admin})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button type="submit" className="p-2 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer">
                      Simpan Staff
                    </button>
                    <button type="button" onClick={() => setIsStaffFormOpen(false)} className="p-2 px-4 bg-white text-slate-700 border rounded-xl text-xs cursor-pointer">
                      Batal
                    </button>
                  </div>
                </form>
              )}

              {/* Data Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs text-slate-800 border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="p-3.5">ID Staff</th>
                      <th className="p-3.5">Username</th>
                      <th className="p-3.5">Kata Sandi</th>
                      <th className="p-3.5">Nama Staff</th>
                      <th className="p-3.5">No. Telepon Staff</th>
                      <th className="p-3.5">ID Admin Pengawas</th>
                      {currentUser.role === "ADMIN" && <th className="p-3.5 text-right">Opsi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {staffList.map((staff) => (
                      <tr key={staff.id_staff} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-emerald-700">#{staff.id_staff}</td>
                        <td className="p-3.5">{staff.username}</td>
                        <td className="p-3.5">••••••••</td>
                        <td className="p-3.5 font-sans">{staff.nama_staff}</td>
                        <td className="p-3.5 font-sans">{staff.no_telp_staff}</td>
                        <td className="p-3.5 text-indigo-700 font-bold">#{staff.id_admin}</td>
                        {currentUser.role === "ADMIN" && (
                          <td className="p-3.5 text-right space-x-2 font-sans">
                            <button 
                              onClick={() => {
                                setStaffForm(staff);
                                setIsEditingStaff(true);
                                setIsStaffFormOpen(true);
                              }}
                              className="text-emerald-600 hover:text-emerald-800"
                            >
                              <Edit className="w-4 h-4 inline" />
                            </button>
                            <button onClick={() => handleDeleteStaff(staff.id_staff)} className="text-rose-600 hover:text-rose-800">
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= 4. MENU: KONSUMEN ================= */}
          {currentMenu === "Konsumen" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold font-serif text-slate-900">Konsumen</h2>
                  <p className="text-xs text-slate-500">Daftar data konsumen atau pengunjung Koriel Garden yang dilayani oleh staff.</p>
                </div>
                <button 
                  onClick={() => {
                    setIsEditingKonsumen(false);
                    setKonsumenForm({ id_konsumen: 0, nama_konsumen: "", no_telp_konsumen: "", id_staff: staffList[0]?.id_staff || 1 });
                    setIsKonsumenFormOpen(true);
                  }}
                  className="p-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Daftarkan Konsumen</span>
                </button>
              </div>

              {isKonsumenFormOpen && (
                <form onSubmit={handleSaveKonsumen} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 max-w-xl">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-xs font-bold uppercase text-emerald-700">
                      {isEditingKonsumen ? "Edit Konsumen" : "Daftarkan Konsumen Baru"}
                    </h3>
                    <button type="button" onClick={() => setIsKonsumenFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Nama Konsumen *</label>
                      <input 
                        type="text" required
                        placeholder="Contoh: Budi Sudarsono"
                        value={konsumenForm.nama_konsumen}
                        onChange={(e) => setKonsumenForm({...konsumenForm, nama_konsumen: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">No. Telpon Konsumen *</label>
                      <input 
                        type="text" required
                        placeholder="Contoh: 0812xxxxxxxx"
                        value={konsumenForm.no_telp_konsumen}
                        onChange={(e) => setKonsumenForm({...konsumenForm, no_telp_konsumen: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Staff Yang Melayani</label>
                      <select 
                        value={konsumenForm.id_staff}
                        onChange={(e) => setKonsumenForm({...konsumenForm, id_staff: parseInt(e.target.value)})}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                      >
                        {staffList.map((s) => (
                          <option key={s.id_staff} value={s.id_staff}>{s.nama_staff} (ID #{s.id_staff})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button type="submit" className="p-2 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer">
                      Simpan Data
                    </button>
                    <button type="button" onClick={() => setIsKonsumenFormOpen(false)} className="p-2 px-4 bg-white text-slate-700 border rounded-xl text-xs cursor-pointer">
                      Batal
                    </button>
                  </div>
                </form>
              )}

              {/* Data Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs text-slate-800 border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="p-3.5">ID Konsumen</th>
                      <th className="p-3.5">Tanggal Terdaftar</th>
                      <th className="p-3.5">Nama Konsumen</th>
                      <th className="p-3.5">No. Telepon Konsumen</th>
                      <th className="p-3.5">ID Staff Pelayan</th>
                      <th className="p-3.5 text-right">Opsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {konsumenList.map((c) => (
                      <tr key={c.id_konsumen} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-emerald-700">#{c.id_konsumen}</td>
                        <td className="p-3.5 font-sans">{new Date(c.tanggal).toLocaleDateString()} {new Date(c.tanggal).toLocaleTimeString()}</td>
                        <td className="p-3.5 font-sans font-semibold text-slate-900">{c.nama_konsumen}</td>
                        <td className="p-3.5 font-sans">{c.no_telp_konsumen}</td>
                        <td className="p-3.5 text-indigo-700 font-bold">#{c.id_staff}</td>
                        <td className="p-3.5 text-right space-x-2 font-sans">
                          <button 
                            onClick={() => {
                              setKonsumenForm(c);
                              setIsEditingKonsumen(true);
                              setIsKonsumenFormOpen(true);
                            }}
                            className="text-emerald-600 hover:text-emerald-800"
                          >
                            <Edit className="w-4 h-4 inline" />
                          </button>
                          <button onClick={() => handleDeleteKonsumen(c.id_konsumen)} className="text-rose-600 hover:text-rose-800">
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= 5. MENU: GAMBAR BUNGA TROPIS ================= */}
          {currentMenu === "Gambar Bunga Tropis" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold font-serif text-slate-900">Gambar Bunga Tropis</h2>
                <p className="text-xs text-slate-500">Daftar foto bunga tropis yang telah diunggah oleh staff untuk diidentifikasi spesiesnya.</p>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs text-slate-800 border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="p-3.5">ID Gambar</th>
                      <th className="p-3.5">Foto Bunga</th>
                      <th className="p-3.5">Tanggal Unggah</th>
                      <th className="p-3.5">ID Staff Pelayan</th>
                      <th className="p-3.5 text-right">Opsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {gambarList.map((g) => (
                      <tr key={g.id_gambar} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-emerald-700">#{g.id_gambar}</td>
                        <td className="p-3.5">
                          {g.file_gambar_bunga_tropis?.startsWith("data:image/") || g.file_gambar_bunga_tropis?.startsWith("http") ? (
                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                              <img src={g.file_gambar_bunga_tropis} className="w-full h-full object-cover" alt="Bunga" referrerPolicy="no-referrer" />
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">Data teks/binary base64...</span>
                          )}
                        </td>
                        <td className="p-3.5 font-sans">{new Date(g.tanggal_foto).toLocaleDateString()} {new Date(g.tanggal_foto).toLocaleTimeString()}</td>
                        <td className="p-3.5 text-indigo-700 font-bold">#{g.id_staff}</td>
                        <td className="p-3.5 text-right font-sans">
                          <button 
                            onClick={() => setSelectedGambarFotoUrl(g.file_gambar_bunga_tropis)}
                            className="p-1.5 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Foto</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= 6. MENU: HASIL IDENTIFIKASI BUNGA TROPIS ================= */}
          {currentMenu === "Hasil Identifikasi Bunga Tropis" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold font-serif text-slate-900">Hasil Identifikasi Bunga Tropis</h2>
                <p className="text-xs text-slate-500">Log riwayat identifikasi spesies bunga, tingkat akurasi kecocokan, serta deskripsi karakteristik botani tanaman hias.</p>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs text-slate-800 border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="p-3.5">ID Hasil</th>
                      <th className="p-3.5">Spesies / Jenis Bunga</th>
                      <th className="p-3.5">Tanggal Analisis</th>
                      <th className="p-3.5">Karakteristik & Deskripsi</th>
                      <th className="p-3.5">Akurasi Analisis</th>
                      <th className="p-3.5">ID Gambar</th>
                      <th className="p-3.5">ID Sinkronisasi</th>
                      <th className="p-3.5 text-right">Opsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {hasilList.map((h) => (
                      <tr key={h.id_hasil} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-emerald-700">#{h.id_hasil}</td>
                        <td className="p-3.5 font-sans font-semibold text-emerald-950">{h.label_kelas}</td>
                        <td className="p-3.5 font-sans">{new Date(h.tanggal_identifikasi).toLocaleDateString()}</td>
                        <td className="p-3.5 font-sans text-slate-600 max-w-xs truncate" title={h.deskripsi_karakteristik}>
                          {h.deskripsi_karakteristik}
                        </td>
                        <td className="p-3.5 font-sans font-bold text-emerald-600">{(h.hasil_akurasi * 100).toFixed(2)}%</td>
                        <td className="p-3.5 text-indigo-700 font-bold">#{h.id_gambar}</td>
                        <td className="p-3.5 text-amber-700 font-bold">{h.id_sinkronisasi ? `#${h.id_sinkronisasi}` : "Belum ada"}</td>
                        <td className="p-3.5 text-right font-sans">
                          <button 
                            onClick={() => setSelectedIdentifikasiDetail(h)}
                            className="p-1.5 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Detail</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= 7. MENU: HASIL SINKRONISASI ================= */}
          {currentMenu === "Hasil Sinkronisasi" && (
            <div className="space-y-6">
              {/* Header section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold font-serif text-slate-900">Hasil Sinkronisasi</h2>
                    <p className="text-xs text-slate-500">
                      Katalog botani resmi Koriel Garden berisi spesies bunga tropis. Kelola karakteristik & cara perawatan harian tanaman hias dalam pangkalan data terpadu.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabular of Flower Catalog */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs text-slate-800 border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="p-4">ID</th>
                      <th className="p-4">Nama Spesies</th>
                      <th className="p-4">Terakhir Sinkron</th>
                      <th className="p-4">Karakteristik & Panduan Perawatan</th>
                      <th className="p-4 text-center">Galeri Foto</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {sinkronisasiList
                      .filter(s => s.nama_spesies?.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((s) => (
                        <tr key={s.id_sinkronisasi} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-emerald-700">#{s.id_sinkronisasi}</td>
                          <td className="p-4 font-sans font-bold text-slate-900 italic">{s.nama_spesies}</td>
                          <td className="p-4 font-sans text-slate-500">
                            {new Date(s.tanggal_sinkronisasi).toLocaleDateString()}
                          </td>
                          <td className="p-4 font-sans text-slate-600 max-w-sm">
                            <p className="line-clamp-2 leading-relaxed" title={s.karakteristik_perawatan}>
                              {s.karakteristik_perawatan}
                            </p>
                          </td>
                          <td className="p-4 font-sans text-center">
                            <span className="inline-block px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold">
                              {(s.galeri_gambar || []).length} Foto
                            </span>
                          </td>
                          <td className="p-4 text-right font-sans">
                            <div className="flex justify-end space-x-2">
                              <button 
                                onClick={() => {
                                  setSelectedSpeciesForDetail(s);
                                }}
                                className="p-1.5 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Lihat Detail</span>
                              </button>
                              
                              <button 
                                onClick={() => {
                                  setSelectedSpeciesForEdit(s);
                                  setEditCharacteristicsText(s.karakteristik_perawatan);
                                }}
                                className="p-1.5 px-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5 text-slate-500" />
                                <span>Edit</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= 8. MENU: LAPORAN HASIL IDENTIFIKASI BUNGA TROPIS ================= */}
          {currentMenu === "Laporan Hasil Identifikasi Bunga Tropis" && (() => {
            const filteredLaporan = laporanList.filter((l) => {
              const dateObj = new Date(l.tanggal_laporan);
              const m = String(dateObj.getMonth() + 1);
              const y = String(dateObj.getFullYear());
              
              const matchBulan = filterLaporanBulan === "ALL" || filterLaporanBulan === m;
              const matchTahun = filterLaporanTahun === "ALL" || filterLaporanTahun === y;
              
              return matchBulan && matchTahun;
            });

            return (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold font-serif text-slate-900">Laporan Hasil Identifikasi Bunga Tropis</h2>
                    <p className="text-xs text-slate-500">Laporan identifikasi bunga bulanan yang disetujui dan ditandatangani oleh manajemen Koriel Garden.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setLaporanForm({ file_dokumen: "Laporan_Identifikasi_Bunga_Tropis_S2_2026.xlsx", id_sinkronisasi: sinkronisasiList[0]?.id_sinkronisasi || 1 });
                      setIsLaporanFormOpen(true);
                    }}
                    className="p-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buat Laporan Baru</span>
                  </button>
                </div>

                {/* Monthly Filter Bar */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Saring Bulan:</span>
                      <select
                        value={filterLaporanBulan}
                        onChange={(e) => setFilterLaporanBulan(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl p-2 px-3 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="ALL">Semua Bulan</option>
                        <option value="1">Januari</option>
                        <option value="2">Februari</option>
                        <option value="3">Maret</option>
                        <option value="4">April</option>
                        <option value="5">Mei</option>
                        <option value="6">Juni</option>
                        <option value="7">Juli</option>
                        <option value="8">Agustus</option>
                        <option value="9">September</option>
                        <option value="10">Oktober</option>
                        <option value="11">November</option>
                        <option value="12">Desember</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Saring Tahun:</span>
                      <select
                        value={filterLaporanTahun}
                        onChange={(e) => setFilterLaporanTahun(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl p-2 px-3 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="ALL">Semua Tahun</option>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 font-medium font-sans">
                    Menampilkan <strong className="text-emerald-700">{filteredLaporan.length}</strong> dari <strong className="text-slate-700">{laporanList.length}</strong> dokumen laporan terarsip.
                  </div>
                </div>

                {isLaporanFormOpen && (
                  <form onSubmit={handleSaveLaporan} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 max-w-xl">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="text-xs font-bold uppercase text-emerald-700">Buat Dokumen Laporan Baru</h3>
                      <button type="button" onClick={() => setIsLaporanFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Pilih Bulan Laporan</label>
                          <select 
                            value={laporanBulan}
                            onChange={(e) => setLaporanBulan(parseInt(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                          >
                            <option value={1}>Januari</option>
                            <option value={2}>Februari</option>
                            <option value={3}>Maret</option>
                            <option value={4}>April</option>
                            <option value={5}>Mei</option>
                            <option value={6}>Juni</option>
                            <option value={7}>Juli</option>
                            <option value={8}>Agustus</option>
                            <option value={9}>September</option>
                            <option value={10}>Oktober</option>
                            <option value={11}>November</option>
                            <option value={12}>Desember</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Pilih Tahun Laporan</label>
                          <select 
                            value={laporanTahun}
                            onChange={(e) => setLaporanTahun(parseInt(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                          >
                            <option value={2026}>2026</option>
                            <option value={2025}>2025</option>
                            <option value={2024}>2024</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Nama Berkas Dokumen</label>
                        <input 
                          type="text" required
                          value={laporanForm.file_dokumen}
                          onChange={(e) => setLaporanForm({...laporanForm, file_dokumen: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Pilih Referensi Sinkronisasi</label>
                        <select 
                          value={laporanForm.id_sinkronisasi}
                          onChange={(e) => setLaporanForm({...laporanForm, id_sinkronisasi: parseInt(e.target.value)})}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none"
                        >
                          {sinkronisasiList.map((s) => (
                            <option key={s.id_sinkronisasi} value={s.id_sinkronisasi}>ID Sinkronisasi #{s.id_sinkronisasi} ({new Date(s.tanggal_sinkronisasi).toLocaleDateString()})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <button type="submit" className="p-2 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer">
                        Simpan & Tanda Tangani
                      </button>
                      <button type="button" onClick={() => setIsLaporanFormOpen(false)} className="p-2 px-4 bg-white text-slate-700 border rounded-xl text-xs cursor-pointer">
                        Batal
                      </button>
                    </div>
                  </form>
                )}

                {/* Data Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-left text-xs text-slate-800 border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold">
                      <tr>
                        <th className="p-3.5">ID Laporan</th>
                        <th className="p-3.5">Periode Laporan</th>
                        <th className="p-3.5">Berkas Laporan</th>
                        <th className="p-3.5">Pembuat Laporan (ID)</th>
                        <th className="p-3.5">ID Sinkronisasi</th>
                        <th className="p-3.5 text-right">Opsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {filteredLaporan.map((l) => {
                        const dateObj = new Date(l.tanggal_laporan);
                        const mNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                        const periodeText = `${mNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                        
                        return (
                          <tr key={l.id_laporan} className="hover:bg-slate-50/50">
                            <td className="p-3.5 font-bold text-emerald-700">#{l.id_laporan}</td>
                            <td className="p-3.5 font-sans font-semibold text-slate-800">{periodeText}</td>
                            <td className="p-3.5 font-sans font-semibold text-slate-900 flex items-center space-x-2">
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{l.file_dokumen}</span>
                            </td>
                            <td className="p-3.5 text-indigo-700 font-bold font-sans">
                              {l.id_admin ? (
                                <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px]">
                                  Admin #{l.id_admin}
                                </span>
                              ) : l.id_staff ? (
                                <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px]">
                                  Staff #{l.id_staff}
                                </span>
                              ) : (
                                <span className="text-slate-400">Sistem</span>
                              )}
                            </td>
                            <td className="p-3.5 text-amber-700 font-bold">#{l.id_sinkronisasi}</td>
                            <td className="p-3.5 text-right font-sans space-x-1">
                              <button 
                                onClick={() => handleDownloadLaporan(l.id_laporan, l.file_dokumen)} 
                                className="text-emerald-700 hover:text-emerald-900 p-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg inline-flex items-center transition-all cursor-pointer"
                                title="Unduh Berkas Laporan (.xls)"
                              >
                                <Upload className="w-4 h-4 rotate-180" />
                              </button>
                              <button onClick={() => handleDeleteLaporan(l.id_laporan)} className="text-rose-600 hover:text-rose-800 p-1 hover:bg-rose-50 rounded-lg inline-flex items-center cursor-pointer">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

        </div>
      </main>

      {/* --- BOTANICAL DETAIL MODAL --- */}
      {selectedSpeciesForDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            {/* Gallery Side */}
            <div className="md:w-1/2 bg-slate-50 p-6 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold uppercase text-emerald-800 tracking-wider font-sans">
                    Galeri Foto Nyata
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Berikut adalah foto-foto nyata bunga yang diambil oleh staff dan diidentifikasi sebagai spesies ini di Koriel Garden.
                </p>

                {(selectedSpeciesForDetail.galeri_gambar || []).length > 0 ? (
                  <div className="space-y-4 pt-2">
                    {/* Main Image Stage */}
                    <div className="relative aspect-square md:aspect-video rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm flex items-center justify-center group">
                      <img 
                        src={(selectedSpeciesForDetail.galeri_gambar || [])[carouselActiveIndex]} 
                        alt={selectedSpeciesForDetail.nama_spesies} 
                        className="w-full h-full object-cover transition-all duration-300" 
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Left navigation arrow */}
                      {carouselActiveIndex > 0 && (
                        <button 
                          type="button"
                          onClick={() => setCarouselActiveIndex(prev => prev - 1)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white shadow-md text-slate-700 transition-all cursor-pointer hover:scale-110 z-10"
                        >
                          <span className="font-bold text-lg leading-none">&larr;</span>
                        </button>
                      )}

                      {/* Right navigation arrow */}
                      {carouselActiveIndex < (selectedSpeciesForDetail.galeri_gambar || []).length - 1 && (
                        <button 
                          type="button"
                          onClick={() => setCarouselActiveIndex(prev => prev + 1)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white shadow-md text-slate-700 transition-all cursor-pointer hover:scale-110 z-10"
                        >
                          <span className="font-bold text-lg leading-none">&rarr;</span>
                        </button>
                      )}

                      {/* Indicator counter bubble (Amazon/Shopee style) */}
                      <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-slate-900/70 text-white rounded-full text-[10px] font-mono font-bold tracking-wider">
                        {carouselActiveIndex + 1} / {(selectedSpeciesForDetail.galeri_gambar || []).length}
                      </div>
                    </div>

                    {/* Thumbnail horizontal strip */}
                    <div className="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-thin">
                      {(selectedSpeciesForDetail.galeri_gambar || []).map((imgUrl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCarouselActiveIndex(i)}
                          className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
                            carouselActiveIndex === i 
                              ? "border-emerald-600 scale-105 shadow-md" 
                              : "border-slate-200 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img src={imgUrl} className="w-full h-full object-cover" alt="Thumbnail" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3 mt-4">
                    <Flower2 className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Belum ada foto nyata yang teridentifikasi untuk spesies ini. <br/>
                      <span className="text-[11px] text-slate-400">Gunakan menu Identifikasi untuk mengambil foto pertama Anda!</span>
                    </p>
                  </div>
                )}
              </div>
              
              <div className="text-[10px] text-slate-400 font-mono mt-6 pt-3 border-t border-slate-100">
                Total Koleksi: {(selectedSpeciesForDetail.galeri_gambar || []).length} Foto
              </div>
            </div>

            {/* Information Side */}
            <div className="md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="p-1 px-2.5 bg-emerald-50 text-emerald-700 text-[9px] rounded-full font-bold uppercase tracking-wider">
                    Referensi Botani #{selectedSpeciesForDetail.id_sinkronisasi}
                  </span>
                  <button 
                    onClick={() => setSelectedSpeciesForDetail(null)} 
                    className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-full cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl font-bold font-serif italic text-slate-900 leading-tight">
                    {selectedSpeciesForDetail.nama_spesies}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Disinkronisasi terakhir pada: {new Date(selectedSpeciesForDetail.tanggal_sinkronisasi).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Karakteristik & Panduan Perawatan:
                  </h4>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans max-h-[300px] overflow-y-auto">
                    {selectedSpeciesForDetail.karakteristik_perawatan}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-6 mt-4 border-t border-slate-100">
                <button 
                  onClick={() => {
                    setSelectedSpeciesForEdit(selectedSpeciesForDetail);
                    setEditCharacteristicsText(selectedSpeciesForDetail.karakteristik_perawatan);
                  }}
                  className="p-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Karakteristik</span>
                </button>
                <button 
                  onClick={() => setSelectedSpeciesForDetail(null)}
                  className="p-2.5 px-4 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- BOTANICAL EDIT CHARACTERISTICS MODAL --- */}
      {selectedSpeciesForEdit && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold uppercase text-emerald-700">Edit Referensi Botani</h3>
                <h2 className="text-md font-bold text-slate-900 font-serif italic">{selectedSpeciesForEdit.nama_spesies}</h2>
              </div>
              <button 
                onClick={() => setSelectedSpeciesForEdit(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSpeciesCharacteristics} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">
                  Karakteristik & Cara Perawatan Tanaman
                </label>
                <textarea 
                  required
                  rows={10}
                  value={editCharacteristicsText}
                  onChange={(e) => setEditCharacteristicsText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed"
                  placeholder="Masukkan detail karakteristik tanaman hias dan langkah perawatannya..."
                />
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-100">
                <button 
                  type="submit" 
                  className="p-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  Simpan Perubahan
                </button>
                <button 
                  type="button" 
                  onClick={() => setSelectedSpeciesForEdit(null)} 
                  className="p-2.5 px-4 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- IDENTIFIKASI DETAIL MODAL --- */}
      {selectedIdentifikasiDetail && (() => {
        const parentGambar = gambarList.find(g => g.id_gambar === selectedIdentifikasiDetail.id_gambar);
        const imgUrl = parentGambar ? parentGambar.file_gambar_bunga_tropis : null;
        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row max-h-[85vh]">
              {/* Image Column */}
              <div className="md:w-1/2 bg-slate-50 border-r border-slate-100 p-6 flex flex-col justify-center items-center">
                {imgUrl ? (
                  <div className="w-full aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm flex items-center justify-center">
                    <img src={imgUrl} className="w-full h-full object-cover" alt="Foto Identifikasi" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white border border-dashed rounded-2xl">
                    <Flower2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <span className="text-xs text-slate-400">Berkas gambar tidak ditemukan</span>
                  </div>
                )}
                <div className="mt-4 text-center">
                  <span className="text-[10px] text-slate-400 font-mono">ID Gambar: #{selectedIdentifikasiDetail.id_gambar}</span>
                </div>
              </div>

              {/* Info Column */}
              <div className="md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="p-1 px-2.5 bg-emerald-50 text-emerald-700 text-[9px] rounded-full font-bold uppercase tracking-wider">
                      Hasil Identifikasi #{selectedIdentifikasiDetail.id_hasil}
                    </span>
                    <button 
                      onClick={() => setSelectedIdentifikasiDetail(null)} 
                      className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-full cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Spesies Teridentifikasi</h3>
                    <h2 className="text-xl font-bold italic text-slate-900 leading-tight">
                      {selectedIdentifikasiDetail.label_kelas}
                    </h2>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Tingkat Akurasi / Persen Kecocokan</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div 
                          className="bg-emerald-600 h-2.5 rounded-full" 
                          style={{ width: `${selectedIdentifikasiDetail.hasil_akurasi * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold font-mono text-emerald-700">{(selectedIdentifikasiDetail.hasil_akurasi * 100).toFixed(2)}%</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Karakteristik & Deskripsi Botani</h3>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans max-h-[180px] overflow-y-auto">
                      {selectedIdentifikasiDetail.deskripsi_karakteristik}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 mt-4 border-t border-slate-100">
                  <button 
                    onClick={() => setSelectedIdentifikasiDetail(null)}
                    className="p-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- PHOTO LIGHTBOX OVERLAY --- */}
      {selectedGambarFotoUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center justify-center space-y-4">
            <button 
              onClick={() => setSelectedGambarFotoUrl(null)}
              className="absolute top-0 right-0 m-4 p-2.5 bg-white/20 hover:bg-white/40 text-white rounded-full cursor-pointer transition-all hover:scale-115 z-10"
              title="Tutup"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
              <img 
                src={selectedGambarFotoUrl} 
                className="max-h-[75vh] w-auto max-w-full object-contain" 
                alt="Bunga Tropis Zoom" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-center">
              <p className="text-xs text-white/80 font-medium tracking-wide">Pratinjau Foto Asli Bunga Tropis Koriel Garden</p>
            </div>
          </div>
        </div>
      )}

      {/* --- CASCADE DELETE CONFIRMATION OVERLAY --- */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-red-100 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-red-700">Konfirmasi Penghapusan Data</h3>
            </div>

            <div className="space-y-3">
              <h2 className="text-md font-bold text-slate-900 leading-snug">
                {deleteConfirmation.title}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Menghapus entitas ini akan memicu penghapusan berantai (cascade delete) pada data berikut:
              </p>
              
              <ul className="bg-red-50/50 border border-red-100 rounded-2xl p-4 space-y-2.5">
                {deleteConfirmation.details.map((detail, idx) => (
                  <li key={idx} className="text-xs text-slate-700 flex items-start space-x-2">
                    <span className="text-red-500 font-bold mt-0.5">•</span>
                    <span className="leading-relaxed">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex space-x-2 pt-2 border-t border-slate-100">
              <button 
                type="button"
                onClick={deleteConfirmation.onConfirm}
                className="flex-1 p-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm transition-colors"
              >
                Ya, Hapus Permanen
              </button>
              <button 
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 p-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
