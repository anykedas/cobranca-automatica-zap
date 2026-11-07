import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Smartphone, 
  SendHorizontal, 
  History, 
  Settings, 
  Database, 
  LogOut,
  X,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  mobileOpen,
  setMobileOpen
}) => {
  const { logout, user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'whatsapp', label: 'Números WhatsApp', icon: Smartphone },
    { id: 'cobrancas', label: 'Cobranças', icon: CreditCard },
    { id: 'historico', label: 'Histórico de Envios', icon: History },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
    { id: 'backup', label: 'Backup & Sistema', icon: Database },
  ];

  const handleSelect = (tabId: string) => {
    setCurrentTab(tabId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Overlay para Mobile */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <SendHorizontal className="w-5 h-5 transform -rotate-12" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight leading-tight">CobraZap Pro</h1>
              <span className="text-[11px] text-emerald-400 font-medium">WhatsApp Automation</span>
            </div>
          </div>
          <button 
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 font-semibold' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/40">
            <div className="truncate">
              <p className="text-xs font-medium text-white truncate">{user?.name || 'Administrador'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email || 'admin@cobranca.com'}</p>
            </div>
            <button
              onClick={logout}
              title="Sair do sistema"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
