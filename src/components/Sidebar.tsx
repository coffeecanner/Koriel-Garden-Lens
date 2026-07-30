import { 
  LayoutDashboard, 
  Shield, 
  Users, 
  User, 
  Image as ImageIcon, 
  Cpu, 
  RefreshCw, 
  FileText,
  LogOut,
  Flower2,
  X
} from "lucide-react";
import { User as UserType } from "../types";

interface SidebarProps {
  currentMenu: string;
  setCurrentMenu: (menu: string) => void;
  user: UserType | null;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ currentMenu, setCurrentMenu, user, onLogout, isOpen = false, onClose }: SidebarProps) {
  const allMenuItems = [
    { name: "Dashboard Utama", id: "Dashboard Utama", icon: LayoutDashboard },
    { name: "Admin", id: "Admin", icon: Shield },
    { name: "Staff", id: "Staff", icon: Users },
    { name: "Konsumen", id: "Konsumen", icon: User },
    { name: "Gambar Bunga Tropis", id: "Gambar Bunga Tropis", icon: ImageIcon },
    { name: "Hasil Identifikasi Bunga Tropis", id: "Hasil Identifikasi Bunga Tropis", icon: Cpu },
    { name: "Hasil Sinkronisasi", id: "Hasil Sinkronisasi", icon: RefreshCw },
    { name: "Laporan Hasil Identifikasi Bunga Tropis", id: "Laporan Hasil Identifikasi Bunga Tropis", icon: FileText },
  ];

  return (
    <>
      {/* Backdrop overlay for mobile when sidebar is open */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-45 lg:hidden transition-opacity"
          id="sidebar-backdrop"
        />
      )}

      <aside 
        id="sidebar-container" 
        className={`fixed inset-y-0 left-0 w-72 bg-white h-screen border-r border-slate-200/80 flex flex-col justify-between select-none z-50 transition-transform duration-300 lg:translate-x-0 lg:static lg:z-0 shrink-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Banner with logo */}
          <div id="sidebar-header" className="p-6 border-b border-slate-200/80 flex items-center justify-between bg-slate-50 text-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-1 bg-emerald-50 rounded-xl border border-emerald-100/80 overflow-hidden">
                <img src="/src/logo.png" alt="Koriel Garden Logo" className="w-7 h-7 object-contain" />
              </div>
              <div>
                <h1 className="text-xs font-bold tracking-wider text-slate-800 uppercase font-display">Koriel Garden</h1>
                <p className="text-[10px] text-emerald-600 font-medium truncate">Sistem Identifikasi Bunga</p>
              </div>
            </div>
            
            {onClose && (
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg lg:hidden cursor-pointer transition-colors"
                title="Tutup Menu"
                id="btn-close-sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Current logged-in role tag */}
          <div id="user-role-badge" className="mx-4 mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate">{user?.name}</div>
              <div className="flex items-center space-x-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${user?.role === "ADMIN" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></span>
                <span className="text-[9px] uppercase tracking-wider text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">{user?.role}</span>
              </div>
            </div>
          </div>

          {/* Navigation list */}
          <nav id="sidebar-nav" className="p-4 space-y-1 mt-4">
            {allMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentMenu === item.id;
              return (
                <button
                  key={item.id}
                  id={`menu-item-${item.id.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => {
                    setCurrentMenu(item.id);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isActive 
                      ? "bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-600/10" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer logout info */}
        <div id="sidebar-footer" className="p-4 border-t border-slate-200/80">
          <button
            id="btn-logout"
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 rounded-xl text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>
    </>
  );
}
