
import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types';

interface AddressingProps {
  items: InventoryItem[];
}

const Addressing: React.FC<AddressingProps> = ({ items }) => {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];

    return items.filter(i => {
      const matchName = i.name.toLowerCase().includes(q);
      const matchSKU = i.sku.toLowerCase().includes(q);
      const matchEAN = i.ean && i.ean.toLowerCase().includes(q);
      // Suporte aos 4 últimos dígitos do EAN
      const matchEANSuffix = i.ean && i.ean.slice(-4).includes(q);

      return matchName || matchSKU || matchEAN || matchEANSuffix;
    }).slice(0, 10);
  }, [items, search]);

  const selectedItem = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;

    return items.find(i => 
      i.sku.toLowerCase() === q || 
      i.name.toLowerCase() === q ||
      (i.ean && i.ean.toLowerCase() === q) ||
      (i.ean && i.ean.slice(-4) === q) // Localização exata por sufixo
    );
  }, [items, search]);

  const allAddresses = useMemo(() => {
    const addresses: any[] = [];
    items.forEach(i => {
      addresses.push({
        label: `${i.location.corridor}-${i.location.shelf}-${i.location.floor}`,
        item: i
      });
    });
    return addresses.sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] -mr-40 -mt-40"></div>
        <h2 className="text-4xl font-black mb-10 text-center text-slate-900 uppercase tracking-tighter">Localizador Inteligente</h2>
        
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Nome, SKU, EAN ou 4 últimos do EAN..."
                value={search}
                onChange={e => { setSearch(e.target.value); setShowAll(false); }}
                className="w-full p-6 border-4 border-slate-50 rounded-[2.5rem] focus:border-amber-500 outline-none text-2xl font-black bg-slate-50 transition-all placeholder:text-slate-300 shadow-inner"
              />
              <span className="absolute right-8 top-7 text-3xl opacity-20">🔍</span>
            </div>
            <button 
              onClick={() => { setShowAll(!showAll); setSearch(''); }}
              className="px-12 py-6 rounded-[2.5rem] bg-slate-900 text-white font-black text-sm uppercase hover:bg-amber-500 transition-all shadow-xl active:scale-95"
            >
              {showAll ? 'LIMPAR BUSCA' : 'MAPA GERAL'}
            </button>
          </div>

          {!selectedItem && suggestions.length > 0 && !showAll && (
            <div className="absolute top-full left-0 right-0 bg-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] rounded-[3rem] mt-4 border border-slate-100 z-50 overflow-hidden divide-y animate-in slide-in-from-top-4 duration-500">
              {suggestions.map(s => (
                <button 
                  key={s.id}
                  onClick={() => setSearch(s.sku)}
                  className="w-full p-8 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-amber-50 text-left group transition-all"
                >
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="font-black text-slate-900 text-xl group-hover:text-amber-600 transition-colors mb-2">{s.name}</p>
                    <div className="flex flex-wrap gap-3">
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">SKU: {s.sku}</span>
                      {s.ean && (
                        <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">EAN: {s.ean}</span>
                      )}
                      <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{s.category}</span>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm shrink-0">
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Endereço</p>
                      <p className="text-xl font-black text-slate-900 tracking-tighter">
                        {s.location.corridor}-{s.location.shelf}-{s.location.floor}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white font-black text-xs">
                      GO
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAll ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-in fade-in zoom-in duration-500 pb-20">
          {allAddresses.map((addr, idx) => (
            <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center group hover:border-amber-500 hover:shadow-2xl transition-all cursor-default">
              <span className="text-[12px] font-black text-amber-500 uppercase mb-3 tracking-widest">{addr.label}</span>
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-slate-50 shadow-inner group-hover:scale-110 transition-transform mb-4 bg-slate-50 flex items-center justify-center">
                {addr.item.fotoUrl ? (
                  <img src={addr.item.fotoUrl} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl opacity-20">📦</span>
                )}
              </div>
              <p className="text-[11px] font-black text-slate-800 text-center line-clamp-2 min-h-[32px] uppercase leading-tight">{addr.item.name}</p>
            </div>
          ))}
        </div>
      ) : selectedItem ? (
        <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="bg-slate-50 p-12 flex items-center justify-center border-r border-slate-100 relative min-h-[500px]">
              <div className="absolute top-10 left-10 bg-white/90 backdrop-blur px-6 py-3 rounded-2xl shadow-sm text-[11px] font-black uppercase text-amber-600 border border-amber-100 z-10">Conferência Visual</div>
              <img src={selectedItem.fotoUrl || 'https://placehold.co/600x600?text=LOGOS+LOGISTICS'} className="max-h-96 w-auto rounded-[3.5rem] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.3)] border-[16px] border-white object-cover" />
            </div>
            <div className="p-16 flex flex-col justify-center bg-white relative overflow-hidden">
              <div className="absolute -bottom-20 -right-20 text-[18rem] font-black text-slate-50 pointer-events-none uppercase select-none">
                {selectedItem.location.corridor}
              </div>
              
              <div className="relative z-10">
                <span className="text-[12px] font-black text-amber-500 uppercase tracking-[0.6em] mb-8 block">Endereçamento em Tempo Real</span>
                <h3 className="text-5xl font-black text-slate-900 leading-tight mb-8 break-words tracking-tighter">{selectedItem.name}</h3>
                
                <div className="flex flex-wrap gap-4 mb-14">
                  <div className="bg-blue-600 px-6 py-3 rounded-2xl shadow-lg shadow-blue-200">
                    <p className="text-[9px] font-black text-blue-100 uppercase mb-1">CÓDIGO SKU</p>
                    <p className="font-mono text-lg font-black text-white">{selectedItem.sku}</p>
                  </div>
                  {selectedItem.ean && (
                    <div className="bg-slate-900 px-6 py-3 rounded-2xl shadow-lg shadow-slate-300">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">CÓDIGO EAN</p>
                      <p className="font-mono text-lg font-black text-white">{selectedItem.ean}</p>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-slate-950 p-10 rounded-[3rem] text-white text-center shadow-2xl transition-transform hover:-translate-y-2">
                    <p className="text-[10px] font-black uppercase opacity-40 mb-3 tracking-[0.3em]">Corredor</p>
                    <p className="text-6xl font-black">{selectedItem.location.corridor}</p>
                  </div>
                  <div className="bg-white p-10 rounded-[3rem] text-slate-800 text-center border-4 border-slate-50 shadow-xl transition-transform hover:-translate-y-2">
                    <p className="text-[10px] font-black uppercase opacity-40 mb-3 tracking-[0.3em]">Prateleira</p>
                    <p className="text-6xl font-black">{selectedItem.location.shelf}</p>
                  </div>
                  <div className="bg-amber-500 p-10 rounded-[3rem] text-white text-center shadow-2xl shadow-amber-200 transition-transform hover:-translate-y-2">
                    <p className="text-[10px] font-black uppercase opacity-40 mb-3 tracking-[0.3em]">Andar</p>
                    <p className="text-6xl font-black">{selectedItem.location.floor}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-40 bg-slate-50 rounded-[6rem] border-8 border-dashed border-white shadow-inner flex flex-col items-center">
          <div className="text-9xl mb-10 filter drop-shadow-2xl animate-bounce">📍</div>
          <p className="text-slate-300 font-black uppercase text-xl tracking-[0.6em]">Aguardando Entrada de Dados</p>
          <p className="text-slate-200 text-xs font-bold mt-6 uppercase tracking-widest italic border-t-2 border-slate-100 pt-6">O LOGOS Intelligence Tracking System</p>
        </div>
      )}
    </div>
  );
};

export default Addressing;
