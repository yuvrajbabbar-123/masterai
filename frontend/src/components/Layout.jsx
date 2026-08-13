import { NavLink, useNavigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Keyboard, House, GraduationCap, ChatCircleDots, Exam, Sparkle,
  Trophy, UserCircle, CreditCard, SignOut, Flame, Lightning, FileText,
} from "@phosphor-icons/react";

const NAV = [
  { to: "/app", label: "Dashboard", icon: House, end: true },
  { to: "/app/typing", label: "Typing Practice", icon: Keyboard },
  { to: "/app/learn", label: "Learn from Scratch", icon: GraduationCap },
  { to: "/app/documents", label: "Learn from Documents", icon: FileText },
  { to: "/app/ask", label: "Ask AI", icon: ChatCircleDots },
  { to: "/app/test", label: "Test Yourself", icon: Exam },
  { to: "/app/word", label: "Word of the Day", icon: Sparkle },
  { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/app/profile", label: "Profile", icon: UserCircle },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isTyping = location.pathname.includes("/typing") || location.pathname.includes("/learn/");

  const doLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="min-h-screen flex bg-[#0A0A0A] relative z-10">
      {/* Sidebar */}
      <aside className={`hidden md:flex flex-col w-64 shrink-0 border-r border-white/10 bg-[#0D0D0D] fixed h-screen transition-opacity duration-500 ${isTyping ? "opacity-40 hover:opacity-100" : "opacity-100"}`}>
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2" data-testid="app-logo">
            <div className="w-8 h-8 rounded-lg bg-[#EAB308] flex items-center justify-center">
              <Keyboard weight="fill" className="text-[#0A0A0A]" size={20} />
            </div>
            <span className="font-display font-black text-xl tracking-tight">MasterAI</span>
          </div>
          <p className="text-[10px] text-[#525252] mt-2 font-mono-type uppercase tracking-widest">Learn with AI. Master without it.</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-[#EAB308] text-[#0A0A0A]" : "text-[#A3A3A3] hover:text-white hover:bg-white/5"
                }`
              }
            >
              <item.icon size={18} weight="bold" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <NavLink to="/app/subscription" data-testid="nav-upgrade"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#EAB308] hover:bg-[#EAB308]/10 transition-colors">
            <CreditCard size={18} weight="bold" /> Upgrade to Pro
          </NavLink>
          <button onClick={doLogout} data-testid="logout-button"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#A3A3A3] hover:text-white hover:bg-white/5 transition-colors">
            <SignOut size={18} weight="bold" /> Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className={`sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/10 transition-opacity duration-500 ${isTyping ? "opacity-40 hover:opacity-100" : "opacity-100"}`}>
          <div className="md:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#EAB308] flex items-center justify-center">
              <Keyboard weight="fill" className="text-[#0A0A0A]" size={16} />
            </div>
            <span className="font-display font-black">MasterAI</span>
          </div>
          <div className="hidden md:block text-sm text-[#525252] font-mono-type">
            {user?.learning_level} level
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm" data-testid="topbar-streak">
              <Flame weight="fill" className="text-orange-500" size={18} />
              <span className="font-semibold tabular-nums">{user?.streak || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm" data-testid="topbar-xp">
              <Lightning weight="fill" className="text-[#EAB308]" size={18} />
              <span className="font-semibold tabular-nums">{user?.xp || 0}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#262626] border border-white/10 flex items-center justify-center overflow-hidden">
              {user?.picture ? <img src={user.picture} alt="" className="w-full h-full object-cover" /> :
                <span className="font-display font-bold text-sm">{user?.name?.[0]?.toUpperCase() || "?"}</span>}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
