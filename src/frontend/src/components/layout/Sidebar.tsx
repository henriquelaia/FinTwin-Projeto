import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Target,
  Calculator,
  Landmark,
  Settings,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Transações' },
  { to: '/accounts',     icon: Landmark,        label: 'Contas' },
  { to: '/budgets',      icon: PiggyBank,       label: 'Orçamentos' },
  { to: '/goals',        icon: Target,          label: 'Metas' },
  { to: '/irs',          icon: Calculator,      label: 'Simulador IRS' },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside
      className="w-60 flex flex-col shrink-0"
      style={{
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.7)',
        boxShadow: '4px 0 24px rgba(73,62,229,0.05)',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #493ee5 0%, #635bff 100%)', boxShadow: '0 4px 12px rgba(73,62,229,0.3)' }}
          >
            <Lock className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-base font-black tracking-tighter leading-none text-[#101c29]">
              Gold<span className="text-[#493ee5]">Lock</span>
            </div>
            <div className="text-[9px] uppercase font-bold mt-0.5 text-[#464555]/40" style={{ letterSpacing: '0.15em' }}>
              High-End Finance
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'text-[#493ee5]'
                  : 'text-[#464555]/70 hover:text-[#101c29]'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { background: 'rgba(73,62,229,0.09)' }
                : {}
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Utilizador + Definições */}
      <div className="p-3 border-t border-white/60">
        {user && (
          <div className="px-3.5 py-2 mb-1">
            <p className="text-xs font-semibold text-[#101c29] truncate">{user.name}</p>
            <p className="text-[11px] text-[#464555]/50 truncate">{user.email}</p>
          </div>
        )}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              isActive ? 'text-[#493ee5]' : 'text-[#464555]/70 hover:text-[#101c29]'
            }`
          }
          style={({ isActive }) => isActive ? { background: 'rgba(73,62,229,0.09)' } : {}}
        >
          <Settings className="w-4 h-4 shrink-0" />
          Definições
        </NavLink>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs text-[#464555]/40 hover:text-[#ba1a1a] transition-colors mt-0.5"
        >
          Terminar sessão
        </button>
      </div>
    </aside>
  );
}
