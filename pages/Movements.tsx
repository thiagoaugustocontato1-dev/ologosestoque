
import React, { useState, useMemo } from 'react';
import { Movement, InventoryItem } from '../types';
import { db } from '../services/db';

interface MovementsProps {
  movements: Movement[];
}

const Movements: React.FC<MovementsProps> = ({ movements }) => {
  const [filters, setFilters] = useState({ type: '', query: '' });

  const filteredMovements = useMemo(() => {
    const q = filters.query.toLowerCase().trim();
    return movements.filter(m => {
      const matchType = filters.type === '' || m.type === filters.type;
      const matchQuery = q === '' || 
        m.itemName.toLowerCase().includes(q) || 
        m.sku.toLowerCase().includes(q) ||
        (m.notes && m.notes.toLowerCase().includes(q)) ||
        m.username.toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [movements, filters]);

  const movementsWithTrajectory = useMemo(() => {
    const sortedAll = [...movements].sort((a, b) => a.timestamp - b.timestamp);
    const itemBalances: Record<string, number> = {};
    const movementsEnhanced = sortedAll.map(m => {
      const prevBalance = itemBalances[m.itemId] || 0;
      let newBalance = prevBalance;
      if (m.type === 'ENTRADA') newBalance += m.quantity;
      else if (m.type === 'SAIDA') newBalance -= m.quantity;
      else if (m.type === 'AJUSTE') newBalance = m.quantity;
      itemBalances[m.itemId] = newBalance;
      return { ...m, balanceAfter: newBalance };
    });
    const filteredIds = new Set(filteredMovements.map(f => f.id));
    return movementsEnhanced.filter(m => filteredIds.has(m.id)).reverse();
  }, [movements, filteredMovements]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 no-print">
         <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="PESQUISAR LOGS (ITEM, SKU, RESPONSÁVEL)..." 
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm font-black text-black outline-none focus:border-[#c5a059] transition-all shadow-inner"
              value={filters.query}
              onChange={e => setFilters({...filters, query: e.target.value.toUpperCase()})}
            />
            <span className="absolute left-4 top-3.5 text-xl opacity-50">🔍</span>
         </div>
         <div className="flex gap-2">
            {['', 'ENTRADA', 'SAIDA'].map(type => (
              <button
                key={type}
                onClick={() => setFilters({...filters, type})}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap border-2 ${
                  filters.type === type 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                  : 'bg-white text-slate-900 border-slate-100 hover:border-[#c5a059]'
                }`}
              >
                {type || 'FLUXO TOTAL'}
              </button>
            ))}
         </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-[10px] font-black text-white uppercase border-b-2 border-[#c5a059]">
            <tr>
              <th className="px-8 py-5">Registro Cronológico</th>
              <th className="px-8 py-5">Produto / Identidade</th>
              <th className="px-8 py-5 text-center">Fluxo</th>
              <th className="px-8 py-5 text-center">Saldo Pos-Op</th>
              <th className="px-8 py-5">Motivação</th>
              <th className="px-8 py-5">Executor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-black text-black">
            {movementsWithTrajectory.map((m) => (
              <tr key={m.id} className="text-xs hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 whitespace-nowrap text-slate-900">
                  {new Date(m.timestamp).toLocaleString()}
                </td>
                <td className="px-8 py-5">
                  <div className="font-black text-black uppercase tracking-tighter">{m.itemName}</div>
                  <div className="text-[9px] text-blue-700 font-black uppercase mt-1">SKU: {m.sku}</div>
                </td>
                <td className="px-8 py-5 text-center">
                  {m.type === 'ENTRADA' ? (
                    <span className="text-green-700 font-black text-sm">+{m.quantity}</span>
                  ) : (
                    <span className="text-red-700 font-black text-sm">-{m.quantity}</span>
                  )}
                </td>
                <td className="px-8 py-5 text-center font-black text-black text-base">
                  {m.balanceAfter}
                </td>
                <td className="px-8 py-5">
                  <div className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    m.notes?.includes('Venda') ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-black border border-slate-200'
                  }`}>
                    {m.notes || 'REGISTRO MANUAL'}
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-black uppercase text-[10px]">{m.username}</span>
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

export default Movements;
