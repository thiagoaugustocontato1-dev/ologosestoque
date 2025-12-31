
import React, { useState, useMemo } from 'react';
import { InventoryItem, User } from '../types';
import { db, formatBRL } from '../services/db';

interface InventoryProps {
  items: InventoryItem[];
  user: User;
  refresh: () => void;
}

const InventoryItemRow = React.memo(({ item, user, onMove, onDelete, onEdit }: { 
  item: InventoryItem, 
  user: User, 
  onMove: (type: 'ENTRADA' | 'SAIDA') => void, 
  onDelete: (id: string) => void,
  onEdit: (item: InventoryItem) => void
}) => (
  <tr className="hover:bg-slate-50 transition-all border-b border-slate-100 group">
    <td className="px-8 py-6">
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-white flex-shrink-0 overflow-hidden border-2 border-slate-100 shadow-sm group-hover:scale-105 transition-transform duration-300">
          {item.fotoUrl ? (
            <img src={item.fotoUrl} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-200 font-logos italic text-2xl">L</div>
          )}
        </div>
        <div className="min-w-0">
          <div className="font-black text-black text-base truncate uppercase tracking-tighter">{item.name}</div>
          <div className="flex flex-wrap gap-2 text-[9px] font-black mt-2 uppercase">
            <span className="bg-blue-600 text-white px-2 py-1 rounded-md shadow-sm">SKU: {item.sku}</span>
            <span className="bg-slate-900 text-white px-2 py-1 rounded-md shadow-sm">EAN: {item.ean}</span>
            <span className="bg-[#c5a059] text-white px-2 py-1 rounded-md shadow-sm">{item.category}</span>
          </div>
        </div>
      </div>
    </td>
    <td className="px-8 py-6">
      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm inline-block">
        <p className="text-[11px] font-black text-black tracking-tight flex items-center gap-2">
          <span className="text-[#c5a059]">📍</span> {item.location.corridor} / {item.location.shelf} / {item.location.floor}
        </p>
      </div>
    </td>
    <td className="px-8 py-6 text-center">
      <div className={`text-2xl font-black ${item.currentQuantity < item.minQuantity ? 'text-red-600 animate-bounce' : 'text-black'}`}>
        {item.currentQuantity}
      </div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Estoque Mín: {item.minQuantity}</div>
    </td>
    <td className="px-8 py-6">
       <div className="flex flex-col gap-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Custo: {formatBRL(item.unitPrice)}</div>
          <div className="text-[13px] font-black text-emerald-700 uppercase">Venda: {formatBRL(item.salePrice)}</div>
       </div>
    </td>
    <td className="px-8 py-6 text-right">
      <div className="flex items-center justify-end gap-3">
        <button onClick={() => onMove('ENTRADA')} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-emerald-600 transition-all active:scale-95">Entrada</button>
        <button onClick={() => onMove('SAIDA')} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-red-600 transition-all active:scale-95">Saída</button>
        <button onClick={() => onEdit(item)} className="p-3 text-slate-400 hover:text-[#c5a059] transition-all bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md" title="Editar">
          <span className="text-lg">✏️</span>
        </button>
        {user.role === 'GERENCIA' && (
          <button onClick={() => onDelete(item.id)} className="p-3 text-slate-200 hover:text-red-600 transition-all bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md" title="Excluir">
            <span className="text-lg">🗑️</span>
          </button>
        )}
      </div>
    </td>
  </tr>
));

const Inventory: React.FC<InventoryProps> = ({ items, user, refresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showMoveModal, setShowMoveModal] = useState<{item: InventoryItem, type: 'ENTRADA'|'SAIDA'} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');
  
  const initialFormState = {
    name: '', ean: '', category: '', minQuantity: "" as any, unitPrice: "" as any, salePrice: "" as any,
    location: { corridor: '', shelf: '', floor: '' }, fotoUrl: ''
  };

  const [newItem, setNewItem] = useState(initialFormState);
  const [moveQty, setMoveQty] = useState<number | string>("");
  const [moveReason, setMoveReason] = useState('');

  const entryReasons = ['COMPRA / REPOSIÇÃO', 'DEVOLUÇÃO DE CLIENTE', 'AJUSTE DE INVENTÁRIO', 'TRANSFERÊNCIA', 'BONIFICAÇÃO', 'OUTROS'];
  const exitReasons = ['VENDA PDV', 'AVARIA / QUEBRA', 'PERDA / ROUBO', 'CONSUMO INTERNO', 'BRINDE / AMOSTRA', 'DEVOLUÇÃO AO FORNECEDOR', 'AJUSTE DE INVENTÁRIO'];

  const existingCategories = useMemo(() => {
    return Array.from(new Set(items.map(i => i.category))).filter(Boolean).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return items.filter(i => {
      const matchSearch = !q || 
        i.name.toLowerCase().includes(q) || 
        i.sku.toLowerCase().includes(q) || 
        i.ean.toLowerCase().includes(q);
      const matchCat = categoryFilter === 'TODAS' || i.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [items, searchQuery, categoryFilter]);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...newItem,
      minQuantity: newItem.minQuantity === "" ? 1 : Number(newItem.minQuantity),
      unitPrice: newItem.unitPrice === "" ? 0 : Number(newItem.unitPrice),
      salePrice: newItem.salePrice === "" ? 0 : Number(newItem.salePrice)
    };

    if (editingItem) {
      db.updateItem(editingItem.id, dataToSave);
      alert("Sucesso: Produto atualizado no catálogo.");
    } else {
      db.addItem(dataToSave as any);
      alert("Sucesso: Novo SKU registrado.");
    }
    closeModal();
    refresh();
  };

  const openAddModal = () => {
    setEditingItem(null);
    setNewItem(initialFormState);
    setShowAddModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setNewItem({
      name: item.name, ean: item.ean, category: item.category,
      minQuantity: item.minQuantity, unitPrice: item.unitPrice, salePrice: item.salePrice,
      location: { ...item.location }, fotoUrl: item.fotoUrl || ''
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setNewItem(initialFormState);
  };

  const handleMove = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = moveQty === "" ? 0 : Number(moveQty);
    if (!showMoveModal || qty <= 0 || !moveReason) {
        alert("Erro: Informe a quantidade e o motivo da movimentação.");
        return;
    }
    try {
      db.registerMovement(user.id, user.username, showMoveModal.item.id, showMoveModal.type, qty, moveReason);
      setShowMoveModal(null);
      setMoveQty("");
      setMoveReason('');
      refresh();
      alert("Sucesso: Fluxo de estoque registrado.");
    } catch (err: any) { alert(err.message); }
  };

  const handleOpenMoveModal = (item: InventoryItem, type: 'ENTRADA' | 'SAIDA') => {
    setShowMoveModal({item, type});
    setMoveReason(type === 'ENTRADA' ? entryReasons[0] : exitReasons[0]);
    setMoveQty("");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 no-print bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex flex-1 gap-4 w-full md:w-auto">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Localizar SKU, Nome ou EAN..." 
              className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#c5a059] focus:bg-white outline-none transition-all font-bold text-black text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <span className="absolute left-6 top-5 text-2xl opacity-30">🔍</span>
          </div>
          <select 
            className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5 font-black text-black text-xs outline-none focus:border-[#c5a059] transition-all"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="TODAS">TODAS CATEGORIAS</option>
            {existingCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button 
            onClick={openAddModal} 
            className="flex-1 md:flex-none bg-[#c5a059] text-white px-10 py-5 rounded-2xl font-black shadow-xl shadow-[#c5a059]/30 uppercase tracking-[0.2em] text-[11px] hover:bg-[#b38e4a] hover:scale-105 transition-all active:scale-95"
          >
            + Novo Produto
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#020617] border-b border-[#c5a059]">
            <tr>
              <th className="px-8 py-7 text-[10px] font-black text-[#c5a059] uppercase tracking-[0.3em]">Produto / Identificação</th>
              <th className="px-8 py-7 text-[10px] font-black text-[#c5a059] uppercase tracking-[0.3em]">Endereçamento</th>
              <th className="px-8 py-7 text-[10px] font-black text-[#c5a059] uppercase tracking-[0.3em] text-center">Saldo Real</th>
              <th className="px-8 py-7 text-[10px] font-black text-[#c5a059] uppercase tracking-[0.3em]">Valores (BRL)</th>
              <th className="px-8 py-7 text-[10px] font-black text-[#c5a059] uppercase tracking-[0.3em] text-right">Controle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map(item => (
              <InventoryItemRow 
                key={item.id} 
                item={item} 
                user={user} 
                onMove={(type) => handleOpenMoveModal(item, type)}
                onDelete={(id) => { if(window.confirm("Deseja remover este item definitivamente do catálogo?")) { db.deleteItem(id); refresh(); } }}
                onEdit={openEditModal}
              />
            ))}
          </tbody>
        </table>
      </div>

      {showMoveModal && (
        <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-xl flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] max-w-sm w-full p-12 shadow-2xl border border-white/20">
            <h2 className={`text-2xl font-black mb-2 uppercase tracking-tighter ${showMoveModal.type === 'ENTRADA' ? 'text-green-700' : 'text-red-700'}`}>
              REGISTRAR {showMoveModal.type}
            </h2>
            <p className="text-black text-[11px] font-black uppercase tracking-widest mb-8">{showMoveModal.item.name}</p>
            <form onSubmit={handleMove} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block text-center">Quantidade</label>
                <input required autoFocus type="number" min="1" value={moveQty} placeholder="--" onChange={e => setMoveQty(e.target.value)} className="w-full border-2 border-slate-200 bg-slate-50 rounded-3xl p-6 text-4xl font-black text-center shadow-inner text-black outline-none focus:border-[#c5a059]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block text-center">Motivo da Operação</label>
                <select 
                  required 
                  className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 font-black text-xs text-black text-center outline-none focus:border-[#c5a059]"
                  value={moveReason}
                  onChange={e => setMoveReason(e.target.value)}
                >
                  {(showMoveModal.type === 'ENTRADA' ? entryReasons : exitReasons).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button type="submit" className={`w-full py-5 text-white rounded-[1.5rem] font-black shadow-xl uppercase tracking-widest text-xs ${showMoveModal.type === 'ENTRADA' ? 'bg-green-700 hover:bg-green-800' : 'bg-red-700 hover:bg-red-800'}`}>
                EFETIVAR MOVIMENTAÇÃO
              </button>
              <button type="button" onClick={() => setShowMoveModal(null)} className="w-full py-2 text-slate-900 font-black text-[10px] uppercase mt-2 tracking-widest hover:text-red-500 transition-colors">ABORTAR</button>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-xl flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] max-w-4xl w-full p-12 shadow-2xl border border-white/20 overflow-y-auto max-h-[95vh]">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black text-black uppercase tracking-tighter italic">
                {editingItem ? 'Editar Registro' : 'Novo Registro Patrimonial'}
              </h2>
              <button onClick={closeModal} className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all text-2xl font-light">×</button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="space-y-4">
                  <div className="aspect-square bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100 overflow-hidden flex flex-col items-center justify-center relative shadow-inner group">
                    {newItem.fotoUrl ? (
                      <img src={newItem.fotoUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="text-center p-8">
                        <span className="text-5xl mb-4 block opacity-20">📸</span>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">Arraste uma imagem ou use o botão abaixo</p>
                      </div>
                    )}
                  </div>
                  <label className="w-full bg-[#020617] text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-center block cursor-pointer hover:bg-black transition-all shadow-xl active:scale-95">
                    Carregar Foto
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setNewItem({ ...newItem, fotoUrl: reader.result as string });
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                </div>

                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nome Descritivo do Item</label>
                    <input required type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl p-4 font-black text-black outline-none focus:border-[#c5a059] focus:bg-white transition-all shadow-inner" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Código EAN (Barras)</label>
                    <input required type="text" value={newItem.ean} onChange={e => setNewItem({...newItem, ean: e.target.value})} className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl p-4 font-black text-black outline-none focus:border-[#c5a059] focus:bg-white transition-all shadow-inner" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Categoria</label>
                    <input required list="categories" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl p-4 font-black text-black outline-none focus:border-[#c5a059] focus:bg-white transition-all shadow-inner" />
                    <datalist id="categories">{existingCategories.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Estoque Crítico (Mínimo)</label>
                    <input required type="number" min="1" value={newItem.minQuantity} placeholder="--" onChange={e => setNewItem({...newItem, minQuantity: e.target.value})} className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl p-4 font-black text-black outline-none focus:border-[#c5a059] focus:bg-white transition-all shadow-inner" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Preço Custo</label>
                       <input required type="number" step="0.01" value={newItem.unitPrice} placeholder="--" onChange={e => setNewItem({...newItem, unitPrice: e.target.value})} className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl p-4 font-black text-black outline-none focus:border-[#c5a059] focus:bg-white transition-all shadow-inner" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-[#c5a059] uppercase mb-2 block tracking-widest">Preço Venda</label>
                       <input required type="number" step="0.01" value={newItem.salePrice} placeholder="--" onChange={e => setNewItem({...newItem, salePrice: e.target.value})} className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl p-4 font-black text-[#c5a059] outline-none focus:border-[#c5a059] focus:bg-white transition-all shadow-inner" />
                    </div>
                  </div>
                  
                  {/* ENDEREÇAMENTO RE-ADICIONADO */}
                  <div className="md:col-span-2 bg-[#020617] p-8 rounded-[2rem] border border-[#c5a059]/30">
                     <h4 className="text-[9px] font-black text-[#c5a059] uppercase tracking-[0.4em] mb-4">Localização Logística (O LOGOS SMART TRACKING)</h4>
                     <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Corredor</label>
                          <input required placeholder="CORR." value={newItem.location.corridor} onChange={e => setNewItem({...newItem, location: {...newItem.location, corridor: e.target.value.toUpperCase()}})} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-black text-white text-center outline-none focus:border-[#c5a059]" />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Prateleira</label>
                          <input required placeholder="PRAT." value={newItem.location.shelf} onChange={e => setNewItem({...newItem, location: {...newItem.location, shelf: e.target.value.toUpperCase()}})} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-black text-white text-center outline-none focus:border-[#c5a059]" />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Andar</label>
                          <input required placeholder="ANDAR" value={newItem.location.floor} onChange={e => setNewItem({...newItem, location: {...newItem.location, floor: e.target.value.toUpperCase()}})} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl font-black text-white text-center outline-none focus:border-[#c5a059]" />
                        </div>
                     </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-10">
                <button type="button" onClick={closeModal} className="flex-1 py-6 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-black transition-colors">Cancelar Operação</button>
                <button type="submit" className="flex-1 bg-[#c5a059] text-white py-6 rounded-2xl font-black shadow-2xl shadow-[#c5a059]/40 uppercase tracking-[0.3em] text-[11px] hover:bg-[#b38e4a] transition-all active:scale-95">
                  {editingItem ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
