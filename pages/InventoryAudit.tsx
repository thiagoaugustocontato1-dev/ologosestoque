
import React, { useState, useMemo } from 'react';
import { InventoryItem, User } from '../types';
import { db } from '../services/db';

interface InventoryAuditProps {
  items: InventoryItem[];
  user: User;
  refresh: () => void;
}

const InventoryAudit: React.FC<InventoryAuditProps> = ({ items, user, refresh }) => {
  const [counts, setCounts] = useState<Record<string, number | string>>({});
  const [isAuditing, setIsAuditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [isProcessing, setIsProcessing] = useState(false);

  const categories = useMemo(() => ['TODAS', ...Array.from(new Set(items.map(i => i.category)))], [items]);

  const filteredItems = useMemo(() => {
    return selectedCategory === 'TODAS' ? items : items.filter(i => i.category === selectedCategory);
  }, [items, selectedCategory]);

  const startAudit = () => {
    const initialCounts: Record<string, number | string> = {};
    // Alterado: Todos os campos em branco por padrão
    filteredItems.forEach(item => initialCounts[item.id] = "");
    setCounts(initialCounts);
    setIsAuditing(true);
  };

  const finalizeAudit = async () => {
    if (!window.confirm("Esta ação irá processar divergências e atualizar o estoque global. Confirmar?")) return;

    setIsProcessing(true);
    try {
      for (const item of filteredItems) {
        const physicalValue = counts[item.id];
        // Tratar campo vazio como contagem zero ou ignorar? Assumimos zero se foi iniciado o processo.
        const physical = physicalValue === "" ? 0 : Number(physicalValue);
        
        if (physical !== item.currentQuantity) {
          const diff = Math.abs(physical - item.currentQuantity);
          const type = physical > item.currentQuantity ? 'ENTRADA' : 'SAIDA';
          
          db.registerMovement(
            user.id, 
            user.username, 
            item.id, 
            type, 
            diff, 
            `Ajuste de Auditoria (${selectedCategory})`
          );
        }
      }
      
      refresh();
      setIsAuditing(false);
      alert("✅ Auditoria finalizada com sucesso! Saldos sincronizados.");
    } catch (err: any) {
      alert("❌ Erro ao finalizar auditoria: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintList = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl no-print relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div>
              <h2 className="text-2xl font-black mb-2 tracking-tighter">Auditoria Global</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Sincronização de Saldos e Auditoria Cega</p>
           </div>
           <div className="flex flex-wrap gap-2">
             <select 
              className="bg-slate-800 border-none rounded-xl text-xs font-black px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              disabled={isAuditing}
             >
               {categories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             <button onClick={handlePrintList} className="bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl text-[10px] font-black transition-all">
                🖨️ LISTA DE CONFERÊNCIA
             </button>
           </div>
        </div>

        <div className="mt-8 flex gap-4">
          {!isAuditing ? (
            <button onClick={startAudit} className="bg-amber-500 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all">
              INICIAR CONTAGEM ({selectedCategory})
            </button>
          ) : (
            <div className="flex gap-4">
              <button 
                onClick={finalizeAudit} 
                disabled={isProcessing}
                className="bg-green-500 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-green-900/20 disabled:opacity-50"
              >
                {isProcessing ? 'PROCESSANDO...' : 'FINALIZAR E AJUSTAR TUDO'}
              </button>
              <button onClick={() => setIsAuditing(false)} className="bg-white/10 text-white px-6 py-4 rounded-2xl font-black text-xs hover:bg-red-500 transition-colors">
                ABORTAR
              </button>
            </div>
          )}
        </div>
        <div className="absolute right-[-20px] top-[-20px] text-white opacity-5 text-9xl font-black pointer-events-none">LOGOS</div>
      </div>

      {(isAuditing || (typeof window !== 'undefined' && window.matchMedia('print').matches)) && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Item / SKU</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Localização</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-center no-print">Saldo Atual</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-center">Contagem Física</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-center no-print">Diferença</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredItems.map(item => {
                const physicalValue = counts[item.id];
                const physical = physicalValue === "" ? 0 : Number(physicalValue);
                const diff = physical - item.currentQuantity;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-8 py-5">
                      <div className="font-black text-slate-800 text-sm">{item.name}</div>
                      <div className="text-[10px] text-blue-500 font-mono font-bold mt-1 uppercase">SKU: {item.sku}</div>
                    </td>
                    <td className="px-8 py-5">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        C:{item.location.corridor} P:{item.location.shelf} A:{item.location.floor}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-center font-black text-slate-300 no-print">{item.currentQuantity}</td>
                    <td className="px-8 py-5 text-center">
                      <input 
                        type="number" 
                        className="w-24 text-center border-2 border-slate-100 rounded-xl p-2 font-black text-lg outline-none focus:border-amber-500 print:border-slate-300"
                        value={physicalValue}
                        placeholder="--"
                        onChange={(e) => setCounts(prev => ({...prev, [item.id]: e.target.value}))}
                      />
                    </td>
                    <td className="px-8 py-5 text-center no-print">
                      {physicalValue === "" ? <span className="text-slate-300 text-[10px] font-black uppercase">Aguardando</span> : (
                        diff === 0 ? <span className="text-green-500 text-[10px] font-black uppercase tracking-widest">Conforme</span> : 
                        <span className={`font-black text-base ${diff > 0 ? 'text-blue-500' : 'text-red-500'}`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InventoryAudit;
