
import React, { useState, useMemo } from 'react';
import { KanbanTask, User } from '../types';
import { db } from '../services/db';

interface KanbanProps {
  tasks: KanbanTask[];
  users: User[];
  user: User;
  refresh: () => void;
}

const Kanban: React.FC<KanbanProps> = ({ tasks, users, user, refresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'MEDIA' as any, assignedTo: '' });

  const columns: {id: KanbanTask['status'], label: string}[] = [
    { id: 'PENDENTE', label: 'Em Fila' },
    { id: 'EM_ANDAMENTO', label: 'Operando' },
    { id: 'RESOLVIDA', label: 'Finalizado' }
  ];

  // Regra de Ouro: Gerência vê tudo, Operador vê apenas o seu
  const visibleTasks = useMemo(() => {
    if (user.role === 'GERENCIA') return tasks;
    return tasks.filter(t => t.assignedTo === user.username);
  }, [tasks, user]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    db.addTask({ ...newTask, status: 'PENDENTE' });
    setShowAddModal(false);
    setNewTask({ title: '', description: '', priority: 'MEDIA', assignedTo: '' });
    refresh();
  };

  const updateStatus = (taskId: string, newStatus: KanbanTask['status']) => {
    db.updateTaskStatus(taskId, newStatus);
    refresh();
  };

  const handleDelete = (taskId: string) => {
    if (user.role !== 'GERENCIA') return;
    db.deleteTask(taskId);
    refresh();
  };

  return (
    <div className="space-y-6">
      {user.role === 'GERENCIA' && (
        <div className="flex justify-end no-print">
          <button onClick={() => setShowAddModal(true)} className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black shadow-lg">
            + DELEGAR TAREFA
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
        {columns.map(col => (
          <div key={col.id} className="bg-slate-100/50 rounded-3xl p-6 flex flex-col border-2 border-white">
            <h3 className="font-black text-slate-900 mb-6 flex items-center justify-between uppercase text-[10px] tracking-widest">
              {col.label}
              <span className="bg-white px-3 py-1 rounded-full text-[10px] text-slate-400 border">
                {visibleTasks.filter(t => t.status === col.id).length}
              </span>
            </h3>
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {visibleTasks.filter(t => t.status === col.id).map(task => (
                <div key={task.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase border ${
                      task.priority === 'ALTA' ? 'bg-red-50 text-red-600 border-red-100' :
                      task.priority === 'MEDIA' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-green-50 text-green-600 border-green-100'
                    }`}>
                      {task.priority}
                    </span>
                    {user.role === 'GERENCIA' && (
                       <button onClick={() => handleDelete(task.id)} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">🗑️</button>
                    )}
                  </div>
                  <h4 className="font-black text-slate-800 text-sm mb-1">{task.title}</h4>
                  <p className="text-[10px] text-slate-400 font-medium mb-4 line-clamp-2">{task.description}</p>
                  
                  <div className="flex items-center gap-2 mb-4 bg-slate-50 p-2 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Executor: {task.assignedTo || 'Público'}</span>
                  </div>

                  <div className="flex gap-2">
                    {col.id !== 'PENDENTE' && (
                      <button onClick={() => updateStatus(task.id, col.id === 'RESOLVIDA' ? 'EM_ANDAMENTO' : 'PENDENTE')} className="flex-1 bg-slate-50 text-slate-400 p-2 rounded-xl text-[9px] font-black uppercase">Recuar</button>
                    )}
                    {col.id !== 'RESOLVIDA' && (
                      <button onClick={() => updateStatus(task.id, col.id === 'PENDENTE' ? 'EM_ANDAMENTO' : 'RESOLVIDA')} className="flex-1 bg-slate-900 text-white p-2 rounded-xl text-[9px] font-black uppercase">Avançar</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-10 shadow-2xl">
            <h2 className="text-2xl font-black mb-6">Delegar Função</h2>
            <form onSubmit={handleAddTask} className="space-y-4">
              <input required placeholder="Título..." type="text" className="w-full border-2 rounded-xl p-4 font-bold" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <select className="border-2 rounded-xl p-3 font-bold text-xs" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}>
                  <option value="BAIXA">BAIXA</option>
                  <option value="MEDIA">MÉDIA</option>
                  <option value="ALTA">ALTA</option>
                </select>
                <select required className="border-2 rounded-xl p-3 font-bold text-xs" value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}>
                  <option value="">RESPONSÁVEL...</option>
                  {users.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}
                </select>
              </div>
              <textarea rows={3} placeholder="Instruções..." className="w-full border-2 rounded-xl p-4 text-xs" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 text-slate-400 font-black">CANCELAR</button>
                <button type="submit" className="flex-1 bg-amber-500 text-white py-4 rounded-2xl font-black">LANÇAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Kanban;
