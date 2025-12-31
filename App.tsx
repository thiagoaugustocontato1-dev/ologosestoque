
import React, { useState, useEffect, useCallback } from 'react';
import { User, InventoryItem, Movement, StockAdjustment, KanbanTask, Role, Sale } from './types';
import { db } from './services/db';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Movements from './pages/Movements';
import Addressing from './pages/Addressing';
import Reports from './pages/Reports';
import Adjustments from './pages/Adjustments';
import Kanban from './pages/Kanban';
import Admin from './pages/Admin';
import GestaoDia from './pages/ManagementDay';
import InventoryAudit from './pages/InventoryAudit';
import CRM from './pages/CRM';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('gestaoDia');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [data, setData] = useState({
    items: [] as InventoryItem[],
    movements: [] as Movement[],
    adjustments: [] as StockAdjustment[],
    tasks: [] as KanbanTask[],
    users: [] as User[],
    sales: [] as Sale[]
  });

  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [items, movements, tasks, users, sales, adjustments] = await Promise.all([
        db.getItems(),
        db.getMovements(),
        db.getTasks(),
        db.getUsers(),
        db.getSales(),
        db.getAdjustments()
      ]);
      setData({ items, movements, tasks, users, sales, adjustments });
    } catch (err: any) {
      console.warn("Falha ao carregar dados locais:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData, user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        const isMaster = authForm.username === 'Thiago_Augusto' && authForm.password === 'Genio';
        const finalRole: Role = isMaster ? 'GERENCIA' : 'OPERADOR';
        await db.addUser({
          id: crypto.randomUUID(),
          username: authForm.username,
          passwordHash: authForm.password,
          role: finalRole,
          permissions: {
            dashboard: true, gestaoDia: true, estoque: true, movimentacoes: true, enderecamento: true,
            relatorios: true, ajustes: true, atividades: true, admin: finalRole === 'GERENCIA'
          }
        });
        setIsRegistering(false);
        setAuthForm({ username: '', password: '' });
        alert(`Conta criada como ${finalRole}! Já pode acessar.`);
      } else {
        const users = await db.getUsers();
        const found = users.find(u => u.username === authForm.username && u.passwordHash === authForm.password);
        if (found) {
          setUser(found);
          setAuthForm({ username: '', password: '' });
        } else {
          setAuthError("Credenciais inválidas.");
        }
      }
    } catch (e: any) {
      setAuthError("Erro no sistema local.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setAuthForm({ username: '', password: '' });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="bg-[#0f172a] rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] max-w-md w-full overflow-hidden p-12 border border-[#c5a059]/20 animate-in zoom-in duration-500">
          <div className="mb-12 text-center">
            <div className="inline-block px-4 py-1.5 bg-[#c5a059] text-white rounded-full text-[9px] font-black uppercase tracking-[0.3em] mb-6">Database Local Offline</div>
            <h1 className="text-6xl font-logos text-[#c5a059] italic tracking-tighter">O <span className="text-white not-italic">LOGOS</span></h1>
            <p className="text-slate-500 font-bold mt-3 text-xs uppercase tracking-widest">Intelligent Logistics System</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4" autoComplete="off">
             <input required placeholder="USUÁRIO" type="text" className="w-full px-6 py-5 bg-slate-900/50 border-2 border-slate-800 text-white rounded-2xl focus:border-[#c5a059] outline-none font-black text-sm tracking-widest" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} />
             <input required placeholder="••••••••" type="password" className="w-full px-6 py-5 bg-slate-900/50 border-2 border-slate-800 text-white rounded-2xl focus:border-[#c5a059] outline-none font-black text-lg tracking-[0.2em]" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
             {authError && <p className="text-red-400 text-[10px] font-black text-center uppercase tracking-widest mt-2">{authError}</p>}
             <button type="submit" className="w-full bg-[#c5a059] hover:bg-[#d4af37] text-white font-black py-6 rounded-[2rem] shadow-2xl transition-all active:scale-95 text-xs tracking-[0.4em] mt-6">
                {isRegistering ? 'EFETUAR REGISTRO' : 'ACESSAR TERMINAL'}
             </button>
          </form>

          <button onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }} className="w-full mt-10 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-[#c5a059] transition-colors">
            {isRegistering ? 'Já possui credenciais? Login' : 'Novo Colaborador? Solicitar Acesso'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout} onRefresh={refreshData} activeTab={activeTab} setActiveTab={setActiveTab}>
      {isLoading && <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent animate-pulse z-[60]" />}
      {activeTab === 'dashboard' && <Dashboard items={data.items} movements={data.movements} />}
      {activeTab === 'gestaoDia' && <GestaoDia items={data.items} movements={data.movements} tasks={data.tasks} sales={data.sales} />}
      {activeTab === 'crm' && <CRM items={data.items} user={user} refresh={refreshData} />}
      {activeTab === 'estoque' && <Inventory items={data.items} user={user} refresh={refreshData} />}
      {activeTab === 'auditoria' && <InventoryAudit items={data.items} user={user} refresh={refreshData} />}
      {activeTab === 'movimentacoes' && <Movements movements={data.movements} />}
      {activeTab === 'enderecamento' && <Addressing items={data.items} />}
      {activeTab === 'relatorios' && <Reports items={data.items} />}
      {activeTab === 'ajustes' && <Adjustments adjustments={data.adjustments} items={data.items} user={user} refresh={refreshData} />}
      {activeTab === 'atividades' && <Kanban tasks={data.tasks} users={data.users} user={user} refresh={refreshData} />}
      {activeTab === 'admin' && <Admin users={data.users} refresh={refreshData} />}
    </Layout>
  );
};

export default App;
