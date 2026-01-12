
import React, { useState, useMemo } from 'react';
import { AppState, Task, Person, UUID } from '../types';
import { Calendar, Plus, Target, X, Trash2, Edit2, CheckCircle2, AlertTriangle, FileText, User, ArrowRight, Clock } from 'lucide-react';

// Hjelpefunksjon for å parse datoer i lokal tid (Berlin time)
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface Props {
  db: AppState;
  isAdmin: boolean;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

const YearlyWheelView: React.FC<Props> = ({ db, isAdmin, onAddTask, onUpdateTask, onDeleteTask }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const globalTasks = useMemo(() => {
    return db.tasks
      .filter(t => t.is_global)
      .sort((a, b) => parseLocalDate(a.deadline).getTime() - parseLocalDate(b.deadline).getTime());
  }, [db.tasks]);

  const tasksByMonth = useMemo(() => {
    const months: Record<number, Task[]> = {};
    for (let i = 0; i < 12; i++) months[i] = [];
    
    globalTasks.forEach(task => {
      const month = parseLocalDate(task.deadline).getMonth();
      months[month].push(task);
    });
    return months;
  }, [globalTasks]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const deadline = formData.get('deadline') as string;
    const responsible_id = formData.get('responsible_id') as string;

    if (editingTask) {
      onUpdateTask({
        ...editingTask,
        title,
        deadline,
        responsible_id,
      });
    } else {
      const newTask: Task = {
        id: crypto.randomUUID(),
        title,
        deadline,
        responsible_id,
        is_global: true,
        occurrence_id: null,
        template_id: null
      };
      onAddTask(newTask);
    }
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const monthNames = [
    'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
  ];

  const currentMonth = new Date().getMonth();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 md:pb-8 animate-in fade-in duration-300 text-left">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Menighetens Årshjul</h2>
          <p className="text-sm text-slate-500">Administrative frister og tilbakevendende hendelser.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md font-bold text-xs shadow-sm hover:bg-indigo-700 transition-all"
          >
            <Plus size={16} /> Ny frist
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {monthNames.map((name, index) => (
          <div key={index} className={`bg-white rounded-lg border shadow-sm flex flex-col transition-all ${index === currentMonth ? 'border-indigo-500 ring-1 ring-indigo-500/10' : 'border-slate-200'}`}>
            <div className={`px-4 py-2 border-b flex justify-between items-center ${index === currentMonth ? 'bg-indigo-50/50' : 'bg-slate-50'}`}>
              <h3 className={`font-bold text-xs uppercase tracking-wider ${index === currentMonth ? 'text-indigo-700' : 'text-slate-600'}`}>{name}</h3>
              {index === currentMonth && <span className="bg-indigo-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">NÅ</span>}
            </div>

            <div className="p-2 space-y-1 flex-1 min-h-[120px]">
              {tasksByMonth[index].length > 0 ? tasksByMonth[index].map(task => {
                const responsible = db.persons.find(p => p.id === task.responsible_id);
                const taskDate = parseLocalDate(task.deadline);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const taskDateNormalized = new Date(taskDate);
                taskDateNormalized.setHours(0, 0, 0, 0);
                const isOverdue = taskDateNormalized < today && index === currentMonth;
                return (
                  <div key={task.id} className="group relative p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 leading-tight truncate pr-4">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold flex items-center gap-1 ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                            <Clock size={10} /> {taskDate.getDate()}.
                          </span>
                          {responsible && (
                            <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1 truncate max-w-[80px]">
                              {responsible.name.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingTask(task); setIsModalOpen(true); }} className="text-slate-400 hover:text-indigo-600"><Edit2 size={12} /></button>
                          <button onClick={() => onDeleteTask(task.id)} className="text-slate-400 hover:text-rose-600"><Trash2 size={12} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-8">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Ingen frister</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="absolute inset-0" onClick={() => { setIsModalOpen(false); setEditingTask(null); }}></div>
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 text-left">
            <div className="px-5 py-4 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="font-bold">{editingTask ? 'Rediger frist' : 'Ny frist i årshjul'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingTask(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Tittel</label>
                <input required name="title" type="text" defaultValue={editingTask?.title || ''} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-semibold outline-none" placeholder="f.eks. Årsmelding" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Fristdato</label>
                <input required name="deadline" type="date" defaultValue={editingTask?.deadline || new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Ansvarlig</label>
                <select name="responsible_id" defaultValue={editingTask?.responsible_id || ''} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium outline-none">
                  <option value="">Velg ansvarlig...</option>
                  {db.persons.filter(p => p.is_active).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white rounded-md font-bold text-sm shadow-sm hover:bg-indigo-700 transition-all mt-2">
                {editingTask ? 'Oppdater frist' : 'Legg til i årshjul'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default YearlyWheelView;
