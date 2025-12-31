
import React, { useState } from 'react';
import { InventoryItem, StockAdjustment, User } from '../types';
import { db } from '../services/db';

interface AdjustmentsProps {
  items: InventoryItem[];
  user: User;
  adjustments: StockAdjustment[];
  refresh: () => void;
}

const Adjustments: React.FC<AdjustmentsProps> = ({ items, user, adjustments, refresh }) => {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [formData, setFormData] = useState({ itemId: '', adjustmentType: 'SAIDA' as 'ENTRADA' | 'SAIDA', deltaQty: 0, reason: '' });

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const item = items.find(i => i.id === formData.itemId);
    if (!item) return;

    db.requestAdjustment({
      itemId: item.id,
      requestedBy: user.username,
      oldQuantity: item.currentQuantity,
      newQuantity: formData.adjustmentType === 'ENTRADA' ? item.currentQuantity + formData.deltaQty : Math.max(0, item.currentQuantity - formData.deltaQty),
      adjustmentType: formData.adjustmentType,
      deltaQuantity: formData.deltaQty,
      reason: formData.reason
    });
    
    setShowRequestModal(false);
    setFormData({ itemId: '', adjustmentType: 'SAIDA', deltaQty: 0, reason: '' });
    refresh();
  };

  const handleProcess = (adjId: string, status: 'APROVADO' | 'REJEITADO') => {
    db.processAdjustment(adjId, status, user.id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end no-print">
        <button onClick={() => setShowRequestModal(true)} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-slate-200">
          SOLICITAR AJUSTE DE FLUXO
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
            <tr>
              <th className="px-6 py-4">Item</th>
              <th className="px-6 py-4 text-center">Operação</th>
              <th className="px-6 py-4 text-center">Impacto (Delta)</th>
              <th className="px-6 py-4">Motivo</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ação Gestora</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs font-bold">
            {[...adjustments].reverse().map(adj => {
              const item = items.find(i => i.id === adj.itemId);
              return (
                <tr key={adj.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="text-slate-800">{item?.name || 'Desconhecido'}</div>
                    <div className="text-[10px] text-blue-500 font-mono">{item?.sku}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-black ${adj.adjustmentType === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {adj.adjustmentType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-slate-400 font-medium">{adj.oldQuantity} un</span>
                    <span className="mx-2">➔</span>
                    <span className="text-blue-600 font-black">{adj.newQuantity} un</span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 italic font-medium">{adj.reason}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-black ${
                      adj.status === 'PENDENTE' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                      adj.status === 'APROVADO' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {adj.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {adj.status === 'PENDENTE' && user.role === 'GERENCIA' && (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleProcess(adj.id, 'APROVADO')} className="bg-green-600 text-white p-2 rounded-lg text-[10px]">OK</button>
                        <button onClick={() => handleProcess(adj.id, 'REJEITADO')} className="bg-red-600 text-white p-2 rounded-lg text-[10px]">X</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-10 shadow-2xl">
            <h2 className="text-2xl font-black mb-8">Novo Ajuste</h2>
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Item Afetado</label>
                <select required className="w-full border-2 rounded-xl p-3 font-bold bg-white" value={formData.itemId} onChange={e => setFormData({...formData, itemId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase">Tipo</label>
                   <select className="w-full border-2 rounded-xl p-3 font-black text-xs bg-white" value={formData.adjustmentType} onChange={e => setFormData({...formData, adjustmentType: e.target.value as any})}>
                      <option value="ENTRADA">ADICIONAR (+)</option>
                      <option value="SAIDA">RETIRAR (-)</option>
                   </select>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase">Quantidade</label>
                   <input required type="number" min="1" className="w-full border-2 rounded-xl p-3 font-black text-lg" value={formData.deltaQty} onChange={e => setFormData({...formData, deltaQty: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Justificativa Técnica</label>
                <textarea required rows={3} className="w-full border-2 rounded-xl p-3 text-sm" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowRequestModal(false)} className="flex-1 py-3 text-slate-400 font-black">FECHAR</button>
                <button type="submit" className="flex-1 bg-slate-950 text-white py-3 rounded-2xl font-black shadow-lg">SOLICITAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Adjustments;
