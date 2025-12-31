
import React, { useState } from 'react';
import { User } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  onRefresh: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, onRefresh, activeTab, setActiveTab, children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleMasterRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const menuItems = [
    { id: 'gestaoDia', label: 'Gestão do Dia', icon: '⚡', enabled: user.permissions.gestaoDia },
    { id: 'dashboard', label: 'Painel de Controle', icon: '📊', enabled: user.permissions.dashboard },
    { id: 'crm', label: 'Ponto de Venda (PDV)', icon: '🛒', enabled: true },
    { id: 'estoque', label: 'Catálogo de Itens', icon: '📦', enabled: user.permissions.estoque },
    { id: 'auditoria', label: 'Auditoria Cega', icon: '🔍', enabled: user.permissions.estoque },
    { id: 'movimentacoes', label: 'Fluxo de Estoque', icon: '🔄', enabled: user.permissions.movimentacoes },
    { id: 'enderecamento', label: 'Endereçamento', icon: '📍', enabled: user.permissions.enderecamento },
    { id: 'relatorios', label: 'Relatórios PDF', icon: '📄', enabled: user.permissions.relatorios },
    { id: 'ajustes', label: 'Ajustes Manuais', icon: '⚖️', enabled: user.permissions.ajustes },
    { id: 'atividades', label: 'Quadro de Tarefas', icon: '📋', enabled: user.permissions.atividades },
    { id: 'admin', label: 'Gestão de Acessos', icon: '🛡️', enabled: user.permissions.admin && user.role === 'GERENCIA' },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <aside className="w-72 bg-[#020617] text-white flex flex-col no-print border-r border-[#c5a059]/30 shadow-2xl z-20">
        <div className="p-10 text-center border-b border-slate-900">
          <h1 className="text-3xl font-logos italic leading-none">
            O <span className="text-[#c5a059] not-italic">LOGOS</span>
          </h1>
          <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-[0.4em] mt-2">Intelligence Logistic</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1 custom-scrollbar">
          {menuItems.filter(item => item.enabled).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-all duration-300 group ${
                activeTab === item.id 
                ? 'bg-[#c5a059] text-white shadow-xl shadow-[#c5a059]/20 translate-x-1' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <span className={`text-xl transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <span className="font-bold text-[11px] uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 bg-slate-900/40 border-t border-slate-900/50">
          <div className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-2xl border border-white/5 mb-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#c5a059] to-[#f1d392] flex items-center justify-center font-black text-white shadow-lg text-lg">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate">{user.username}</p>
              <p className="text-[9px] text-[#c5a059] font-black uppercase tracking-widest">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout} 
            className="w-full py-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white transition-all duration-300 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-red-500/20"
          >
            Encerrar Sessão
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative flex flex-col">
        <header className="px-10 py-8 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center no-print sticky top-0 z-10 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-black uppercase tracking-tighter leading-none">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">SISTEMA INTEGRADO DE GESTÃO PATRIMONIAL</p>
          </div>
          <div className="flex gap-4">
             <button 
                onClick={handleMasterRefresh}
                className={`bg-[#020617] text-[#c5a059] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-[#c5a059]/30 shadow-lg flex items-center gap-2 transition-all active:scale-95 ${isRefreshing ? 'opacity-50' : 'hover:bg-black'}`}
             >
                <span className={`text-sm ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
                {isRefreshing ? 'Sincronizando...' : 'Atualizar Sistema'}
             </button>
          </div>
        </header>
        
        <div className="p-10 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
