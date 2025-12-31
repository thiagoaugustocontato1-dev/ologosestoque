
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { db } from '../services/db';

interface AdminProps {
  users: User[];
  refresh: () => void;
}

const Admin: React.FC<AdminProps> = ({ users, refresh }) => {
  const [interestRate, setInterestRate] = useState(2.5);
  const [maxDiscountRate, setMaxDiscountRate] = useState(10.0);

  // Fix: Handle async nature of interestRate and maxDiscountRate retrieval
  useEffect(() => {
    const loadSettings = async () => {
      const [rate, discount] = await Promise.all([
        db.getInterestRate(),
        db.getMaxDiscountRate()
      ]);
      setInterestRate(rate);
      setMaxDiscountRate(discount);
    };
    loadSettings();
  }, []);

  const togglePermission = (userId: string, key: keyof User['permissions']) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const newPerms = { ...user.permissions, [key]: !user.permissions[key] };
    db.updateUserPermissions(userId, newPerms);
    refresh();
  };

  const changeRole = (userId: string, role: Role) => {
    if(window.confirm(`ATENÇÃO: Você está alterando o nível hierárquico deste usuário para ${role}. Confirmar promoção/rebaixamento?`)) {
      db.updateUserRole(userId, role);
      refresh();
    }
  };

  const saveSettings = () => {
    db.setInterestRate(interestRate);
    db.setMaxDiscountRate(maxDiscountRate);
    alert("Configurações globais atualizadas!");
    refresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-[#c5a059]/40 shadow-2xl">
          <h3 className="text-[#c5a059] font-black text-sm uppercase mb-2 tracking-widest">💡 Controle de Patentes</h3>
          <p className="text-slate-300 text-xs font-medium uppercase tracking-wider leading-relaxed">
            Como Gestor, você tem autoridade para promover Operadores ao nível de Gerência ou restringir acessos modulares.
          </p>
        </div>

        <div className="bg-[#c5a059] p-8 rounded-[2.5rem] text-white space-y-6 shadow-xl border border-white/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-sm uppercase mb-1 tracking-tighter">Taxas Financeiras</h3>
              <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Configuração do Checkout</p>
            </div>
            <button 
              onClick={saveSettings}
              className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-black transition-all border border-white/10"
            >
              SALVAR TUDO
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
              <label className="text-[9px] font-black uppercase text-white/60 mb-2 block tracking-widest">Juros Crédito (%)</label>
              <input 
                type="number" 
                step="0.01" 
                className="w-full bg-transparent border-none text-white font-black text-xl outline-none"
                value={interestRate}
                onChange={e => setInterestRate(Number(e.target.value))}
              />
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
              <label className="text-[9px] font-black uppercase text-white/60 mb-2 block tracking-widest">Desconto Máx (%)</label>
              <input 
                type="number" 
                step="0.1" 
                className="w-full bg-transparent border-none text-white font-black text-xl outline-none"
                value={maxDiscountRate}
                onChange={e => setMaxDiscountRate(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0f172a] rounded-[2.5rem] shadow-2xl border border-[#c5a059]/20 overflow-hidden">
        <div className="p-6 border-b border-[#c5a059]/10 bg-slate-900/50">
           <h4 className="text-[#c5a059] font-black text-xs uppercase tracking-[0.2em]">Listagem de Credenciais Ativas</h4>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-[10px] font-black text-slate-400 uppercase border-b border-[#c5a059]/10">
            <tr>
              <th className="px-8 py-5">Colaborador / Identidade</th>
              <th className="px-8 py-5">Patente (Nível de Acesso)</th>
              <th className="px-8 py-5">Módulos Habilitados</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-800/30 transition-all">
                <td className="px-8 py-6">
                   <p className="font-black text-white uppercase text-sm">{u.username}</p>
                   <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">SISTEMA ID: {u.id.slice(0,8)}</p>
                </td>
                <td className="px-8 py-6">
                   <select 
                    className={`px-4 py-3 rounded-xl text-[10px] font-black border uppercase transition-all outline-none cursor-pointer ${
                      u.role === 'GERENCIA' ? 'bg-[#c5a059] border-[#c5a059] text-white' : 'bg-slate-950 border-slate-700 text-slate-300'
                    }`}
                    value={u.role}
                    disabled={u.username === 'Thiago_Augusto'}
                    onChange={(e) => changeRole(u.id, e.target.value as Role)}
                   >
                     <option value="OPERADOR">OPERADOR</option>
                     <option value="GERENCIA">GERÊNCIA</option>
                   </select>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(u.permissions).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => togglePermission(u.id, key as any)}
                        disabled={u.username === 'Thiago_Augusto' && key === 'admin'}
                        className={`px-3 py-2 rounded-lg text-[9px] font-black border transition-all ${
                          val 
                          ? 'bg-slate-800 text-[#c5a059] border-[#c5a059]/60 shadow-inner' 
                          : 'bg-slate-950 text-slate-500 border-slate-900 opacity-30 hover:opacity-100'
                        }`}
                      >
                        {key.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Admin;
