
import React from 'react';
import { InventoryItem } from '../types';
import { formatBRL } from '../services/db';

interface ReportsProps {
  items: InventoryItem[];
}

const Reports: React.FC<ReportsProps> = ({ items }) => {
  const lowStockItems = items.filter(i => i.currentQuantity < i.minQuantity);
  const totalValue = items.reduce((acc, curr) => acc + (curr.currentQuantity * curr.unitPrice), 0);
  const criticalValue = lowStockItems.reduce((acc, curr) => acc + (curr.unitPrice * (curr.minQuantity - curr.currentQuantity)), 0);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page { size: A4; margin: 0.5cm; }
          body { background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Relatórios Patrimoniais</h2>
        <button onClick={handlePrint} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-black shadow-xl text-xs uppercase">🖨️ IMPRIMIR PDF</button>
      </div>

      <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-12 border-b-4 border-amber-500 pb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-950 tracking-tighter italic leading-none">O <span className="text-amber-500 not-italic">LOGOS</span></h1>
            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.5em] mt-2">Logística & Gestão Patrimonial Inteligente</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-slate-800">{new Date().toLocaleDateString('pt-BR')}</p>
            <p className="text-[9px] text-green-600 font-bold uppercase mt-1">● Database Syncronized</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-950 p-6 rounded-3xl text-white shadow-lg">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Valor Total Ativo</p>
            <p className="text-2xl font-black">{formatBRL(totalValue)}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custo de Reposição Crítica</p>
            <p className="text-2xl font-black text-red-600">{formatBRL(criticalValue)}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Itens em Alerta</p>
            <p className="text-2xl font-black text-slate-800">{lowStockItems.length} SKUs</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-slate-900 pl-4">Reposição Crítica de Estoque</h3>
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-950 text-white uppercase text-[9px]">
              <tr>
                <th className="px-5 py-4 rounded-tl-xl">Item / EAN</th>
                <th className="px-5 py-4 text-center">Saldo</th>
                <th className="px-5 py-4 text-center">Mínimo</th>
                <th className="px-5 py-4 text-right rounded-tr-xl">Investimento</th>
              </tr>
            </thead>
            <tbody className="divide-y border">
              {lowStockItems.map(item => (
                <tr key={item.id}>
                  <td className="px-5 py-4">
                    <p className="font-black text-slate-800 uppercase">{item.name}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">EAN: {item.ean}</p>
                  </td>
                  <td className="px-5 py-4 text-center font-black text-red-600">{item.currentQuantity}</td>
                  <td className="px-5 py-4 text-center text-slate-500">{item.minQuantity}</td>
                  <td className="px-5 py-4 text-right font-black">{formatBRL((item.minQuantity - item.currentQuantity) * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
