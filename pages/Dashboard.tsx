
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { InventoryItem, Movement } from '../types';
import { formatBRL } from '../services/db';

interface DashboardProps {
  items: InventoryItem[];
  movements: Movement[];
}

const Dashboard: React.FC<DashboardProps> = ({ items, movements }) => {
  const totalValue = items.reduce((acc, curr) => acc + (curr.currentQuantity * curr.unitPrice), 0);
  const lowStockItems = items.filter(i => i.currentQuantity < i.minQuantity);
  const totalUnits = items.reduce((acc, curr) => acc + curr.currentQuantity, 0);

  const healthData = [
    { name: 'Itens em Conformidade', value: items.length - lowStockItems.length },
    { name: 'Itens em Alerta', value: lowStockItems.length },
  ];
  const HEALTH_COLORS = ['#c5a059', '#ef4444'];

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toLocaleDateString('pt-BR');
  }).reverse();

  const flowData = last7Days.map(date => {
    const dayMovs = movements.filter(m => new Date(m.timestamp).toLocaleDateString('pt-BR') === date);
    return {
      date,
      entradas: dayMovs.filter(m => m.type === 'ENTRADA').reduce((a, b) => a + b.quantity, 0),
      saidas: dayMovs.filter(m => m.type === 'SAIDA').reduce((a, b) => a + b.quantity, 0),
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3 italic">Valor Patrimonial Total</p>
          <p className="text-3xl font-black text-black tracking-tighter">
            {formatBRL(totalValue)}
          </p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-red-50 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3 italic">Rupturas de Estoque</p>
          <p className="text-3xl font-black text-red-600 tracking-tighter">{lowStockItems.length} <span className="text-xs font-bold text-slate-300">SKUs</span></p>
        </div>
        <div className="bg-[#020617] p-8 rounded-[2.5rem] shadow-2xl transition-all hover:shadow-[#c5a059]/10 hover:-translate-y-1">
          <p className="text-[#c5a059] text-[10px] font-black uppercase tracking-[0.2em] mb-3 italic">Giro Diário (24h)</p>
          <p className="text-3xl font-black text-white tracking-tighter">
            {movements.filter(m => m.timestamp > Date.now() - 86400000).length} <span className="text-xs font-bold text-slate-500 uppercase">Movs</span>
          </p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3 italic">Volume de Unidades</p>
          <p className="text-3xl font-black text-black tracking-tighter">{totalUnits} <span className="text-xs font-bold text-slate-300 uppercase">Peças</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm h-[450px]">
          <h3 className="text-sm font-black text-black uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-xs italic">O</span>
            Tendência de Fluxo Operacional (Últ. 7 dias)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: '900', fill: '#cbd5e1'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#cbd5e1'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '11px'}} />
                <Bar dataKey="entradas" fill="#c5a059" radius={[6, 6, 0, 0]} name="Aportes (+)" barSize={35} />
                <Bar dataKey="saidas" fill="#0f172a" radius={[6, 6, 0, 0]} name="Expedição (-)" barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm h-[450px]">
          <h3 className="text-sm font-black text-black uppercase tracking-[0.2em] mb-10">Saúde do Ativo</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="45%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {healthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={HEALTH_COLORS[index % HEALTH_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '15px', fontWeight: 'bold'}} />
                <Legend 
                    verticalAlign="bottom" 
                    iconType="rect" 
                    formatter={(val) => <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
