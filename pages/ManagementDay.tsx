
import React, { useMemo } from 'react';
import { InventoryItem, Movement, KanbanTask, Sale } from '../types';
import { formatBRL } from '../services/db';

interface GestaoDiaProps {
  items: InventoryItem[];
  movements: Movement[];
  tasks: KanbanTask[];
  sales: Sale[];
}

const GestaoDia: React.FC<GestaoDiaProps> = ({ items, movements, tasks, sales }) => {
  const hojeInicio = new Date().setHours(0, 0, 0, 0);
  
  // Consolidação Financeira Real
  const vendasHoje = useMemo(() => sales.filter(s => s.timestamp >= hojeInicio), [sales, hojeInicio]);
  const faturamentoHoje = useMemo(() => vendasHoje.reduce((acc, curr) => acc + curr.totalPrice, 0), [vendasHoje]);
  
  // Consolidação de Fluxo de Estoque
  const movsHoje = useMemo(() => movements.filter(m => m.timestamp >= hojeInicio), [movements, hojeInicio]);
  const totalEntradas = movsHoje.filter(m => m.type === 'ENTRADA').reduce((a, b) => a + b.quantity, 0);
  const totalSaidas = movsHoje.filter(m => m.type === 'SAIDA').reduce((a, b) => a + b.quantity, 0);
  
  // Alertas Reais de Inventário
  const itensCriticos = useMemo(() => items.filter(i => i.currentQuantity < i.minQuantity), [items]);
  const valorRuptura = useMemo(() => itensCriticos.reduce((acc, curr) => acc + (curr.minQuantity - curr.currentQuantity) * curr.unitPrice, 0), [itensCriticos]);

  // Alertas de Operação
  const tarefasPendentes = useMemo(() => tasks.filter(t => t.status !== 'RESOLVIDA' && t.priority === 'ALTA'), [tasks]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-2 space-y-6">
        {/* Painel Financeiro e Fluxo (Navy) */}
        <div className="bg-[#0f172a] p-8 rounded-[3rem] text-white border border-[#c5a059]/40 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
             <span className="text-9xl font-logos italic">O</span>
          </div>
          <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter text-[#c5a059]">Performance Operacional - Hoje</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 p-6 rounded-3xl border border-[#c5a059]/20 shadow-inner">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Faturamento Realizado</p>
              <p className="text-3xl font-black text-[#c5a059]">{formatBRL(faturamentoHoje)}</p>
              <p className="text-[9px] font-bold text-slate-300 mt-2 italic">{vendasHoje.length} ordens finalizadas</p>
            </div>
            <div className="bg-slate-900/80 p-6 rounded-3xl border border-emerald-900/30">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Entradas do Dia</p>
              <p className="text-3xl font-black text-emerald-400">+{totalEntradas} <span className="text-xs">un</span></p>
              <p className="text-[9px] font-bold text-slate-300 mt-2 italic">Carga de reposição</p>
            </div>
            <div className="bg-slate-900/80 p-6 rounded-3xl border border-red-900/30">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Saídas do Dia</p>
              <p className="text-3xl font-black text-red-400">-{totalSaidas} <span className="text-xs">un</span></p>
              <p className="text-[9px] font-bold text-slate-300 mt-2 italic">Volume expedido</p>
            </div>
          </div>
        </div>

        {/* Auditoria de Rupturas (Branco) */}
        <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-black uppercase tracking-widest flex items-center gap-2">
              <span className="text-red-600">⚠</span> ALERTA DE RUPTURAS ATIVAS
            </h3>
            <span className="bg-red-700 text-white px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg uppercase">REPOSIÇÃO: {formatBRL(valorRuptura)}</span>
          </div>
          <div className="space-y-3">
            {itensCriticos.slice(0, 6).map(item => (
              <div key={item.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-[#c5a059] transition-all group shadow-sm">
                <div className="min-w-0">
                   <p className="font-black text-black text-sm uppercase truncate group-hover:text-[#c5a059]">{item.name}</p>
                   <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">SKU: {item.sku} • END: {item.location.corridor}-{item.location.shelf}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black text-red-700 uppercase">Faltam: {item.minQuantity - item.currentQuantity}</p>
                  <p className="text-[10px] font-black text-slate-700">Saldo: {item.currentQuantity} / Mín: {item.minQuantity}</p>
                </div>
              </div>
            ))}
            {itensCriticos.length === 0 && (
              <div className="text-center py-12 bg-emerald-50 rounded-[2rem] border-2 border-emerald-100">
                <p className="text-emerald-800 font-black uppercase text-sm tracking-[0.2em]">✅ Tudo Sincronizado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Atividades (Gold) */}
        <div className="bg-[#c5a059] p-8 rounded-[3rem] text-white shadow-2xl border-4 border-[#0f172a]">
          <h3 className="font-black mb-6 uppercase text-sm tracking-[0.2em] border-b-2 border-white/20 pb-3">Prioridades</h3>
          <div className="space-y-4">
            {tarefasPendentes.map(task => (
              <div key={task.id} className="bg-[#0f172a] p-5 rounded-2xl border border-white/10 shadow-lg">
                <p className="font-black text-xs uppercase text-[#c5a059] mb-1">{task.title}</p>
                <p className="text-[10px] text-slate-200 leading-relaxed italic">{task.description}</p>
                <div className="mt-4 flex justify-between items-center pt-3 border-t border-white/5">
                   <span className="text-[9px] font-black bg-[#c5a059] text-white px-2 py-1 rounded uppercase tracking-widest">RESP: {task.assignedTo || 'GERAL'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Log de Fluxo (Navy) */}
        <div className="bg-slate-900 p-8 rounded-[3rem] border border-[#c5a059]/30 shadow-2xl">
           <h3 className="font-black text-[#c5a059] uppercase tracking-widest mb-6 border-b border-[#c5a059]/10 pb-2">Fluxo em Tempo Real</h3>
           <div className="space-y-5">
              {movements.slice(-5).reverse().map(m => (
                <div key={m.id} className="flex gap-4 items-center group">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-lg transition-transform group-hover:scale-110 ${m.type === 'ENTRADA' ? 'bg-emerald-900 text-emerald-400 border border-emerald-500/30' : 'bg-red-900 text-red-400 border border-red-500/30'}`}>
                      {m.type === 'ENTRADA' ? 'IN' : 'OUT'}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-white uppercase truncate group-hover:text-[#c5a059] transition-colors">{m.itemName}</p>
                      <p className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter">OP: {m.username} • {new Date(m.timestamp).toLocaleTimeString()}</p>
                   </div>
                   <span className={`text-sm font-black italic ${m.type === 'ENTRADA' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.type === 'ENTRADA' ? '+' : '-'}{m.quantity}
                   </span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default GestaoDia;
