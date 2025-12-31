
import React, { useState, useMemo, useCallback } from 'react';
import { InventoryItem, User, Sale, SaleItem, PaymentMethod, Customer } from '../types';
import { db, formatBRL } from '../services/db';

interface CRMProps {
  items: InventoryItem[];
  user: User;
  refresh: () => void;
}

const CRM: React.FC<CRMProps> = ({ items, user, refresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<'NOVA_VENDA' | 'CLIENTES' | 'HISTORICO'>('NOVA_VENDA');
  
  // Clientes
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerListSearch, setCustomerListSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({ name: '', doc: '', email: '', contact: '' });
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // Venda (PDV)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('DINHEIRO');
  const [installments, setInstallments] = useState(1);
  const [manualDiscount, setManualDiscount] = useState<number | string>("");
  const [itemRows, setItemRows] = useState<{id: string, itemId: string, quantity: number | string, search: string}[]>([
    { id: crypto.randomUUID(), itemId: '', quantity: 1, search: '' }
  ]);
  const [isSelling, setIsSelling] = useState(false);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);

  // Filtros Histórico
  const [historySearch, setHistorySearch] = useState('');
  const [dateFilter, setDateFilter] = useState({ 
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Fix: Load async data in useEffect instead of useMemo to avoid return type issues
  React.useEffect(() => {
    const loadData = async () => {
      const [salesData, customersData] = await Promise.all([
        db.getSales(),
        db.getCustomers()
      ]);
      setAllSales(salesData);
      setCustomers(customersData);
    };
    loadData();
  }, [activeSubTab, isSelling, showAddCustomer]);

  const filteredHistory = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    return allSales.filter(s => {
      const matchSearch = !q || s.customerName.toLowerCase().includes(q) || s.customerDoc.includes(q) || s.id.includes(q);
      const saleDate = new Date(s.timestamp).toISOString().split('T')[0];
      const matchDate = saleDate >= dateFilter.start && saleDate <= dateFilter.end;
      return matchSearch && matchDate;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [allSales, historySearch, dateFilter]);

  const historyMetrics = useMemo(() => {
    const total = filteredHistory.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const totalDiscount = filteredHistory.reduce((acc, curr) => acc + (curr.discount || 0), 0);
    const totalInterest = filteredHistory.reduce((acc, curr) => acc + (curr.interestValue || 0), 0);
    const count = filteredHistory.length;
    return {
      total,
      totalDiscount,
      totalInterest,
      count,
      avgTicket: count > 0 ? total / count : 0
    };
  }, [filteredHistory]);

  const customerSuggestions = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q || selectedCustomerId) return [];
    return customers.filter(c => 
      c.id.toLowerCase().includes(q) || 
      c.name.toLowerCase().includes(q) || 
      c.doc.includes(q)
    ).slice(0, 5);
  }, [customers, customerSearch, selectedCustomerId]);

  const filteredCustomers = useMemo(() => {
    const q = customerListSearch.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(c => 
      c.id.toLowerCase().includes(q) || 
      c.name.toLowerCase().includes(q) || 
      c.doc.toLowerCase().includes(q)
    );
  }, [customers, customerListSearch]);

  const selectedCustomer = useMemo(() => customers.find(c => c.uuid === selectedCustomerId), [customers, selectedCustomerId]);

  const saleItemsList: SaleItem[] = useMemo(() => {
    return itemRows.map(row => {
      const detail = items.find(i => i.id === row.itemId);
      const qty = row.quantity === "" ? 0 : Number(row.quantity);
      return {
        itemId: row.itemId,
        itemName: detail?.name || '',
        ean: detail?.ean || '',
        quantity: qty,
        unitPrice: detail?.unitPrice || 0,
        salePrice: detail?.salePrice || 0,
        totalPrice: (detail?.salePrice || 0) * qty
      };
    }).filter(i => i.itemId !== '');
  }, [itemRows, items]);

  const subtotal = useMemo(() => saleItemsList.reduce((acc, curr) => acc + curr.totalPrice, 0), [saleItemsList]);
  const totalMargin = useMemo(() => saleItemsList.reduce((acc, curr) => acc + (curr.salePrice - curr.unitPrice) * curr.quantity, 0), [saleItemsList]);
  
  const discountToApply = useMemo(() => {
    if (paymentMethod === 'CREDITO') return 0;
    const val = manualDiscount === "" ? 0 : Number(manualDiscount);
    // Hardcoded fallback for missing settings in PDV context
    const maxDiscountAllowed = (subtotal * 10) / 100;
    return Math.min(val, totalMargin, maxDiscountAllowed);
  }, [paymentMethod, manualDiscount, totalMargin, subtotal]);

  const interestValue = useMemo(() => 
    paymentMethod === 'CREDITO' && installments > 1 
    ? ((subtotal - discountToApply) * (2.5 / 100) * installments) 
    : 0
  , [paymentMethod, installments, subtotal, discountToApply]);
  
  const finalTotal = subtotal - discountToApply + interestValue;

  const handleSale = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || saleItemsList.length === 0) {
      alert("Selecione um cliente e adicione itens.");
      return;
    }
    setIsSelling(true);
    try {
      const sale = await db.processSale(user.id, user.username, {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerDoc: selectedCustomer.doc,
        customerContact: selectedCustomer.contact,
        items: saleItemsList,
        subtotal,
        discount: discountToApply,
        totalPrice: finalTotal,
        paymentMethod,
        installments: paymentMethod === 'CREDITO' ? installments : 1,
        interestValue
      });
      setViewingSale(sale);
      setSelectedCustomerId(null);
      setCustomerSearch('');
      setItemRows([{ id: crypto.randomUUID(), itemId: '', quantity: 1, search: '' }]);
      setManualDiscount("");
      setInstallments(1);
      refresh();
    } catch (err: any) { alert(err.message); }
    finally { setIsSelling(false); }
  }, [selectedCustomer, saleItemsList, user, subtotal, discountToApply, finalTotal, paymentMethod, installments, interestValue, refresh]);

  const handleSendNPS = (sale: Sale) => {
    const phone = sale.customerContact.replace(/\D/g, '');
    const message = `Olá ${sale.customerName}! Agradecemos sua compra na O LOGOS. Como foi sua experiência? De 0 a 10, quanto você nos indicaria para um amigo? Sua opinião é fundamental para nossa logística!`;
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Fix: handleSaveCustomer is now async to properly await addCustomer result
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      await db.updateCustomer(editingCustomer.uuid, customerForm);
      alert("Cliente atualizado!");
    } else {
      const newC = await db.addCustomer(customerForm);
      setSelectedCustomerId(newC.uuid);
    }
    setShowAddCustomer(false);
    setEditingCustomer(null);
    setCustomerForm({ name: '', doc: '', email: '', contact: '' });
    refresh();
  };

  const openEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustomerForm({ name: c.name, doc: c.doc, email: c.email, contact: c.contact });
    setShowAddCustomer(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex gap-4 no-print border-b border-slate-200 pb-4">
        <button onClick={() => setActiveSubTab('NOVA_VENDA')} className={`px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all shadow-md ${activeSubTab === 'NOVA_VENDA' ? 'bg-[#c5a059] text-white' : 'bg-white text-slate-400 border border-slate-200 hover:text-black'}`}>🛒 Checkout PDV</button>
        <button onClick={() => setActiveSubTab('CLIENTES')} className={`px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all shadow-md ${activeSubTab === 'CLIENTES' ? 'bg-[#c5a059] text-white' : 'bg-white text-slate-400 border border-slate-200 hover:text-black'}`}>👥 Clientes</button>
        <button onClick={() => setActiveSubTab('HISTORICO')} className={`px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all shadow-md ${activeSubTab === 'HISTORICO' ? 'bg-[#020617] text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-200 hover:text-black'}`}>📈 Faturamento Geral</button>
      </div>

      {activeSubTab === 'NOVA_VENDA' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Identificação do Cliente</h3>
                <button onClick={() => { setEditingCustomer(null); setCustomerForm({name:'', doc:'', email:'', contact:''}); setShowAddCustomer(true); }} className="text-[10px] font-black text-blue-600 uppercase transition-colors hover:underline">+ Novo Registro</button>
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="LOCALIZAR CLIENTE POR NOME, DOC OU ID..."
                  className="w-full border-2 border-slate-100 rounded-2xl p-5 font-black bg-slate-50 text-black focus:border-[#c5a059] outline-none text-lg transition-all"
                  value={selectedCustomer ? selectedCustomer.name : customerSearch}
                  readOnly={!!selectedCustomer}
                  onChange={e => setCustomerSearch(e.target.value.toUpperCase())}
                />
                {selectedCustomer && (
                  <button onClick={() => {setSelectedCustomerId(null); setCustomerSearch('');}} className="absolute right-6 top-6 text-[10px] font-black text-red-500 bg-red-50 px-3 py-2 rounded-xl shadow-sm hover:bg-red-100">TROCAR</button>
                )}
                {customerSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl mt-3 z-50 border border-slate-100 overflow-hidden divide-y divide-slate-100">
                    {customerSuggestions.map(c => (
                      <button key={c.uuid} onClick={() => setSelectedCustomerId(c.uuid)} className="w-full p-5 hover:bg-slate-50 text-left flex justify-between items-center transition-all">
                        <div>
                          <p className="font-black text-sm text-black uppercase">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{c.id} • {c.doc}</p>
                        </div>
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full uppercase">Vincular</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Itens da Operação</h3>
                <button type="button" onClick={() => setItemRows([...itemRows, { id: crypto.randomUUID(), itemId: '', quantity: 1, search: '' }])} className="bg-[#020617] text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg">+ Adicionar Item</button>
              </div>
              <div className="space-y-4">
                {itemRows.map(row => {
                  const currentItem = items.find(i => i.id === row.itemId);
                  const suggestions = row.search.length >= 2 ? items.filter(i => 
                    i.name.toLowerCase().includes(row.search.toLowerCase()) || 
                    i.sku.toLowerCase().includes(row.search.toLowerCase()) ||
                    i.ean.includes(row.search)
                  ).slice(0, 5) : [];

                  return (
                    <div key={row.id} className="flex gap-4 p-5 bg-slate-50 rounded-2xl items-center relative border border-slate-200">
                      <div className="flex-1 relative">
                        <input 
                          type="text" 
                          placeholder="DIGITE NOME, EAN OU SKU..."
                          className="w-full bg-white border-none rounded-xl p-3.5 font-bold text-sm text-black shadow-sm outline-none focus:ring-1 focus:ring-[#c5a059]"
                          value={row.search || (currentItem?.name || '')}
                          onChange={e => setItemRows(itemRows.map(r => r.id === row.id ? { ...r, search: e.target.value.toUpperCase(), itemId: '' } : r))}
                        />
                        {row.search && !row.itemId && suggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl mt-2 z-50 border border-slate-100 overflow-hidden divide-y divide-slate-50">
                            {suggestions.map(s => (
                              <button key={s.id} onClick={() => setItemRows(itemRows.map(r => r.id === row.id ? { ...r, itemId: s.id, search: '' } : r))} className="w-full p-4 hover:bg-slate-50 text-left flex justify-between items-center transition-all">
                                <div>
                                  <p className="font-black text-[11px] text-black uppercase">{s.name}</p>
                                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">ESTOQUE: {s.currentQuantity} • {formatBRL(s.salePrice)}</p>
                                </div>
                                <span className="text-[9px] font-black text-white bg-[#c5a059] px-3 py-1.5 rounded-lg uppercase">OK</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {currentItem && (
                          <div className="flex gap-4 mt-2.5">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EAN: {currentItem.ean}</span>
                             <span className={`text-[10px] font-black uppercase tracking-widest ${currentItem.currentQuantity < currentItem.minQuantity ? 'text-red-500' : 'text-emerald-600'}`}>Estoque Atual: {currentItem.currentQuantity} UN</span>
                          </div>
                        )}
                      </div>
                      <input 
                        type="number" 
                        min="1" 
                        className="w-20 p-3.5 rounded-xl font-black bg-white text-black shadow-sm text-center outline-none border border-slate-200"
                        value={row.quantity}
                        onChange={e => setItemRows(itemRows.map(r => r.id === row.id ? { ...r, quantity: e.target.value } : r))}
                      />
                      <div className="w-28 text-right font-black text-black text-base">
                        {formatBRL((currentItem?.salePrice || 0) * (row.quantity === "" ? 0 : Number(row.quantity)))}
                      </div>
                      <button onClick={() => setItemRows(itemRows.filter(r => r.id !== row.id))} className="text-red-400 hover:text-red-600 transition-colors px-3 text-xl">×</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#020617] p-8 rounded-[3rem] text-white shadow-2xl">
              <h3 className="text-xs font-black text-[#c5a059] uppercase tracking-widest mb-8 border-b border-white/5 pb-4">Conclusão de Pagamento</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-2">
                  {(['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO'] as PaymentMethod[]).map(method => (
                    <button key={method} onClick={() => {setPaymentMethod(method); if(method !== 'CREDITO') setInstallments(1);}} className={`py-4 rounded-xl text-[10px] font-black transition-all border ${paymentMethod === method ? 'bg-[#c5a059] border-[#c5a059] text-white' : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'}`}>{method}</button>
                  ))}
                </div>

                {paymentMethod === 'CREDITO' ? (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase">Parcelas</label>
                    <select className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 font-black text-white outline-none" value={installments} onChange={e => setInstallments(Number(e.target.value))}>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x de {formatBRL(finalTotal/n)}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ajuste de Bonificação</label>
                    <input type="number" step="0.01" className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 font-black text-emerald-400 outline-none text-xl text-center" value={manualDiscount} placeholder="0.00" onChange={e => setManualDiscount(e.target.value)} />
                  </div>
                )}

                <div className="pt-6 border-t border-white/5 space-y-3">
                  <div className="flex justify-between text-xs text-slate-400 font-bold uppercase"><span>Subtotal Bruto</span><span>{formatBRL(subtotal)}</span></div>
                  {discountToApply > 0 && <div className="flex justify-between text-xs text-emerald-400 font-bold uppercase"><span>Bonificação (-)</span><span>-{formatBRL(discountToApply)}</span></div>}
                  {interestValue > 0 && <div className="flex justify-between text-xs text-[#c5a059] font-bold uppercase"><span>Juros (+)</span><span>+{formatBRL(interestValue)}</span></div>}
                  <div className="flex justify-between items-end pt-6 border-t border-white/10">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Líquido</span>
                    <span className="text-4xl font-black text-white tracking-tighter">{formatBRL(finalTotal)}</span>
                  </div>
                </div>

                <button 
                  onClick={handleSale} 
                  disabled={isSelling || !selectedCustomer || saleItemsList.length === 0} 
                  className="w-full bg-[#c5a059] text-white font-black py-6 rounded-2xl shadow-xl hover:bg-[#d4af37] transition-all uppercase text-xs tracking-widest disabled:opacity-20 active:scale-95"
                >
                  {isSelling ? 'PROCESSANDO...' : 'EMITIR COMPROVANTE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'CLIENTES' && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-300">
           <div className="p-8 border-b border-slate-100 flex justify-between items-center gap-6">
              <input 
                  type="text" 
                  placeholder="PESQUISAR CLIENTE..." 
                  className="max-w-md w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-black outline-none focus:border-[#c5a059]"
                  value={customerListSearch}
                  onChange={e => setCustomerListSearch(e.target.value.toUpperCase())}
              />
              <button onClick={() => { setEditingCustomer(null); setCustomerForm({name:'', doc:'', email:'', contact:''}); setShowAddCustomer(true); }} className="bg-[#c5a059] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-md">+ Novo</button>
           </div>
           <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                <tr>
                  <th className="px-8 py-5">Identificação</th>
                  <th className="px-8 py-5">Documento</th>
                  <th className="px-8 py-5">Contato</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map(c => (
                  <tr key={c.uuid} className="hover:bg-slate-50 transition-all">
                    <td className="px-8 py-6">
                      <p className="font-black text-black uppercase text-sm">{c.name}</p>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{c.id}</span>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-600">{c.doc}</td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-600">{c.contact}</td>
                    <td className="px-8 py-6 text-right space-x-2">
                       <button onClick={() => openEditCustomer(c)} className="text-[10px] font-black text-slate-400 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-100 transition-all uppercase">Editar</button>
                       <button onClick={() => { setSelectedCustomerId(c.uuid); setActiveSubTab('NOVA_VENDA'); }} className="text-[10px] font-black text-[#c5a059] border border-[#c5a059] px-4 py-2 rounded-xl hover:bg-[#c5a059] hover:text-white transition-all uppercase">Vender</button>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      )}

      {activeSubTab === 'HISTORICO' && (
        <div className="space-y-6 animate-in fade-in duration-300">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6 no-print">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Faturado</p>
                <p className="text-2xl font-black text-black">{formatBRL(historyMetrics.total)}</p>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume de Vendas</p>
                <p className="text-2xl font-black text-black">{historyMetrics.count} <span className="text-xs text-slate-300 italic">pedidos</span></p>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Médio</p>
                <p className="text-2xl font-black text-black">{formatBRL(historyMetrics.avgTicket)}</p>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Bonificado (-)</p>
                <p className="text-2xl font-black text-emerald-600">-{formatBRL(historyMetrics.totalDiscount)}</p>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/50">
                 <input 
                    type="text" 
                    placeholder="PESQUISAR NO HISTÓRICO..." 
                    className="flex-1 bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-black outline-none focus:border-[#c5a059]"
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value.toUpperCase())}
                 />
                 <div className="flex gap-2">
                   <input type="date" className="bg-white border-2 border-slate-100 rounded-xl px-4 py-2 text-xs font-bold" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} />
                   <input type="date" className="bg-white border-2 border-slate-100 rounded-xl px-4 py-2 text-xs font-bold" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} />
                 </div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-[#020617] text-[10px] font-black text-[#c5a059] uppercase">
                  <tr>
                    <th className="px-8 py-5">Data / Hora</th>
                    <th className="px-8 py-5">Cliente / Operador</th>
                    <th className="px-8 py-5">Pagamento</th>
                    <th className="px-8 py-5 text-right">Valor Líquido</th>
                    <th className="px-8 py-5 text-right">Comprovante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map(sale => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-all group">
                      <td className="px-8 py-6 text-xs font-bold text-slate-600">
                        {new Date(sale.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-black text-black uppercase text-sm">{sale.customerName}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Atendente: {sale.userName}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-black bg-slate-100 text-slate-900 px-3 py-1 rounded-lg uppercase tracking-widest">{sale.paymentMethod}</span>
                      </td>
                      <td className="px-8 py-6 text-right font-black text-black text-base">
                        {formatBRL(sale.totalPrice)}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => setViewingSale(sale)} className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase underline decoration-2 underline-offset-4 transition-all">Reemitir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      )}

      {/* MODAL CLIENTE */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] max-w-md w-full p-10 shadow-2xl border border-slate-100">
            <h2 className="text-2xl font-black text-black uppercase tracking-tighter mb-8 italic">
              {editingCustomer ? "Editar Registro" : "Novo Registro de Ativo"}
            </h2>
            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <input required placeholder="NOME COMPLETO" className="w-full bg-slate-50 border-2 border-slate-100 text-black rounded-2xl p-4 font-black outline-none focus:border-[#c5a059] uppercase" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value.toUpperCase()})} />
              <input required placeholder="CPF / CNPJ" className="w-full bg-slate-50 border-2 border-slate-100 text-black rounded-2xl p-4 font-black outline-none focus:border-[#c5a059]" value={customerForm.doc} onChange={e => setCustomerForm({...customerForm, doc: e.target.value})} />
              <input required placeholder="TELEFONE / WHATSAPP" className="w-full bg-slate-50 border-2 border-slate-100 text-black rounded-2xl p-4 font-black outline-none focus:border-[#c5a059]" value={customerForm.contact} onChange={e => setCustomerForm({...customerForm, contact: e.target.value})} />
              <input type="email" placeholder="EMAIL" className="w-full bg-slate-50 border-2 border-slate-100 text-black rounded-2xl p-4 font-black outline-none focus:border-[#c5a059] uppercase" value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} />
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowAddCustomer(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs">Cancelar</button>
                <button type="submit" className="flex-1 bg-[#c5a059] text-white py-4 rounded-2xl font-black shadow-xl uppercase text-xs">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPROVANTE FISCAL MELHORADO */}
      {viewingSale && (
        <div className="fixed inset-0 bg-[#020617]/95 backdrop-blur-md flex items-center justify-center p-4 z-[100] no-print-bg">
          <div className="bg-white rounded-3xl max-w-md w-full p-12 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in duration-300 modal-content border border-slate-100">
            <div className="text-center mb-10 border-b-2 border-dashed border-slate-200 pb-8">
               <h2 className="text-3xl font-logos text-[#020617] uppercase italic leading-none">O <span className="text-[#c5a059] not-italic">LOGOS</span></h2>
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">Logística & Ativos Inteligentes</p>
               <div className="mt-6 p-3 bg-slate-50 rounded-2xl font-mono text-[10px] font-bold text-slate-600 border border-slate-100">
                 CUPOM DE OPERAÇÃO: #{viewingSale.id.slice(0,8).toUpperCase()}
               </div>
               <p className="text-[9px] text-slate-400 mt-2 font-black uppercase">{new Date(viewingSale.timestamp).toLocaleString('pt-BR')}</p>
            </div>
            
            <div className="space-y-8">
               <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Identificação do Cliente</p>
                  <p className="text-sm font-black text-black uppercase leading-tight">{viewingSale.customerName}</p>
                  <p className="text-[10px] font-bold text-slate-500 tracking-tighter">DOC: {viewingSale.customerDoc} | TEL: {viewingSale.customerContact}</p>
               </div>

               <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                    <span>Descrição do Item</span>
                    <span>Total</span>
                  </div>
                  {viewingSale.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-4">
                       <div className="flex-1">
                          <p className="text-[11px] font-black text-black uppercase leading-tight">{item.itemName}</p>
                          <p className="text-[9px] font-bold text-slate-400">{item.quantity} UN x {formatBRL(item.salePrice)}</p>
                       </div>
                       <span className="text-xs font-black text-black">{formatBRL(item.totalPrice)}</span>
                    </div>
                  ))}
               </div>

               <div className="bg-slate-50 p-8 rounded-[2rem] space-y-3 border border-slate-200 shadow-inner">
                  <div className="flex justify-between text-xs text-slate-500 font-bold uppercase tracking-widest"><span>Subtotal Bruto</span><span>{formatBRL(viewingSale.subtotal)}</span></div>
                  {viewingSale.discount > 0 && <div className="flex justify-between text-xs text-emerald-600 font-bold uppercase tracking-widest"><span>Bonificações (-)</span><span>-{formatBRL(viewingSale.discount)}</span></div>}
                  {viewingSale.interestValue && viewingSale.interestValue > 0 && <div className="flex justify-between text-xs text-[#c5a059] font-bold uppercase tracking-widest"><span>Acréscimos (+)</span><span>+{formatBRL(viewingSale.interestValue)}</span></div>}
                  <div className="flex justify-between items-end pt-5 border-t-2 border-dashed border-slate-300">
                    <span className="text-xs font-black text-black uppercase tracking-widest">Total Líquido</span>
                    <span className="text-3xl font-black text-[#020617] tracking-tighter">{formatBRL(viewingSale.totalPrice)}</span>
                  </div>
                  <div className="pt-4 text-[10px] font-black text-slate-500 uppercase text-center border-t border-slate-200 mt-4 leading-none">
                    Forma: {viewingSale.paymentMethod} {viewingSale.installments && viewingSale.installments > 1 ? `(${viewingSale.installments}x)` : ''}
                  </div>
               </div>

               <div className="text-center pt-4 opacity-50">
                  <p className="text-[8px] font-bold text-slate-400 uppercase leading-none tracking-[0.2em]">Obrigado pela preferência!</p>
                  <p className="text-[7px] font-bold text-slate-300 uppercase mt-2">Sistema Gestor O Logos v7.0.2</p>
               </div>
            </div>

            <div className="flex gap-4 mt-12 no-print">
               <button onClick={() => window.print()} className="flex-1 bg-[#020617] text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black transition-all shadow-xl">Imprimir</button>
               <button onClick={() => handleSendNPS(viewingSale)} className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-xl">WhatsApp</button>
               <button onClick={() => setViewingSale(null)} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-200 transition-all">Sair</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
