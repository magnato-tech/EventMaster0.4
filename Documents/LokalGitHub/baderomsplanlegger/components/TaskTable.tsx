
import React, { useState, useMemo } from 'react';
import { Task, TaskCategory } from '../types';
import { isBeforeToday } from '../utils/dateUtils';

interface TaskTableProps {
  tasks: Task[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onOpenTaskDetail: (task: Task) => void;
}

type SortKey = 'isDone' | 'title' | 'parentMilestoneId' | 'predecessorId' | 'plannedDate' | 'estimatedCost';

interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  'Ledelse': 'bg-purple-100 text-purple-700 border-purple-200',
  'Teknisk': 'bg-blue-100 text-blue-700 border-blue-200',
  'Praktisk': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Planlegging': 'bg-orange-100 text-orange-700 border-orange-200',
  'Logistikk': 'bg-rose-100 text-rose-700 border-rose-200',
  'Annet': 'bg-slate-100 text-slate-700 border-slate-200'
};

const TaskTable: React.FC<TaskTableProps> = ({ tasks, onUpdate, onDelete, onOpenTaskDetail }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'plannedDate', direction: 'asc' });

  const milestones = tasks.filter(t => t.isMilestone);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTasks = useMemo(() => {
    const sortableTasks = [...tasks];
    sortableTasks.sort((a, b) => {
      let valA: any = a[sortConfig.key];
      let valB: any = b[sortConfig.key];

      // Spesialhåndtering for referanser (sorter på navn i stedet for ID)
      if (sortConfig.key === 'parentMilestoneId') {
        valA = tasks.find(t => t.id === a.parentMilestoneId)?.title || '';
        valB = tasks.find(t => t.id === b.parentMilestoneId)?.title || '';
      } else if (sortConfig.key === 'predecessorId') {
        valA = tasks.find(t => t.id === a.predecessorId)?.title || '';
        valB = tasks.find(t => t.id === b.predecessorId)?.title || '';
      }

      // Håndtering av udefinerte verdier
      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableTasks;
  }, [tasks, sortConfig]);

  const getOptions = (currentTask: Task) => {
    const phaseOptions = milestones.filter(m => m.id !== currentTask.id);
    let predecessorOptions: Task[] = [];
    let groupLabel = "TILGJENGELIGE OPPGAVER";

    if (currentTask.parentMilestoneId) {
        const phaseMilestone = milestones.find(m => m.id === currentTask.parentMilestoneId);
        const tasksInSamePhase = tasks.filter(t => 
            t.id !== currentTask.id && 
            t.parentMilestoneId === currentTask.parentMilestoneId
        );
        predecessorOptions = phaseMilestone ? [phaseMilestone, ...tasksInSamePhase] : tasksInSamePhase;
        groupLabel = `OPPGAVER I DENNE FASEN`;
    } else if (currentTask.isMilestone) {
        predecessorOptions = tasks.filter(t => t.id !== currentTask.id);
        groupLabel = "KOBLE TIL ANDRE FASER/OPPGAVER";
    } else {
        predecessorOptions = tasks.filter(t => t.id !== currentTask.id);
        groupLabel = "ALLE OPPGAVER";
    }

    return { phaseOptions, predecessorOptions, groupLabel };
  };

  const SortIndicator = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) return <span className="ml-1 opacity-20">⇅</span>;
    return <span className="ml-1 text-indigo-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th 
                className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16 cursor-pointer hover:text-slate-600 transition-colors"
                onClick={() => requestSort('isDone')}
              >
                Status<SortIndicator columnKey="isDone" />
              </th>
              <th 
                className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors"
                onClick={() => requestSort('title')}
              >
                Beskrivelse<SortIndicator columnKey="title" />
              </th>
              <th 
                className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 cursor-pointer hover:text-slate-600 transition-colors"
                onClick={() => requestSort('parentMilestoneId')}
              >
                Tilhører Fase<SortIndicator columnKey="parentMilestoneId" />
              </th>
              <th 
                className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-44 cursor-pointer hover:text-slate-600 transition-colors"
                onClick={() => requestSort('predecessorId')}
              >
                Forutsetning<SortIndicator columnKey="predecessorId" />
              </th>
              <th 
                className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-36 cursor-pointer hover:text-slate-600 transition-colors"
                onClick={() => requestSort('plannedDate')}
              >
                Frist<SortIndicator columnKey="plannedDate" />
              </th>
              <th 
                className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28 cursor-pointer hover:text-slate-600 transition-colors"
                onClick={() => requestSort('estimatedCost')}
              >
                Kostnad<SortIndicator columnKey="estimatedCost" />
              </th>
              <th className="px-6 py-4 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedTasks.map(task => {
              const isLate = !task.isDone && isBeforeToday(task.plannedDate);
              const { phaseOptions, predecessorOptions, groupLabel } = getOptions(task);

              return (
                <tr 
                  key={task.id} 
                  className={`group cursor-pointer ${task.isDone ? 'bg-slate-50/50' : task.isMilestone ? 'bg-amber-50/20' : ''}`}
                  onClick={() => onOpenTaskDetail(task)}
                >                  <td className="px-6 py-4 text-center">
                    <button onClick={() => onUpdate(task.id, { isDone: !task.isDone })} className={`w-6 h-6 flex items-center justify-center border-2 ${task.isMilestone ? 'rotate-45' : 'rounded-lg'} ${task.isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                      {task.isDone && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <input type="text" value={task.title} onChange={(e) => onUpdate(task.id, { title: e.target.value })} className={`bg-transparent border-none focus:ring-0 p-0 text-sm font-bold outline-none ${task.isDone ? 'line-through text-slate-400' : 'text-slate-800'} ${task.isMilestone ? 'uppercase tracking-tighter text-indigo-700' : ''}`} />
                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md inline-block w-fit mt-1 border ${CATEGORY_COLORS[task.category]}`}>{task.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {!task.isMilestone ? (
                      <select 
                        value={task.parentMilestoneId || ''} 
                        onChange={(e) => onUpdate(task.id, { parentMilestoneId: e.target.value || undefined, predecessorId: undefined })} 
                        className="text-[10px] w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none font-bold text-slate-600 focus:border-indigo-300"
                      >
                          <option value="">-- Velg Fase --</option>
                          {phaseOptions.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                      </select>
                    ) : (
                      <span className="text-[9px] font-black text-slate-300 uppercase italic">Er en hovedfase</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <select 
                        value={task.predecessorId || ''} 
                        onChange={(e) => onUpdate(task.id, { predecessorId: e.target.value || undefined })} 
                        className={`text-[10px] w-full border rounded px-2 py-1.5 outline-none font-medium transition-colors ${task.predecessorId ? 'border-indigo-200 text-indigo-700 bg-indigo-50/30' : 'border-slate-200 text-slate-500 bg-white'}`}
                    >
                        <option value="">Ingen (uavhengig)</option>
                        <optgroup label={groupLabel}>
                            {predecessorOptions.map(p => (
                                <option key={p.id} value={p.id}>{p.isMilestone ? '◆ ' : ''}{p.title}</option>
                            ))}
                        </optgroup>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <input type="date" value={task.plannedDate} onChange={(e) => onUpdate(task.id, { plannedDate: e.target.value })} className={`bg-transparent border-none focus:ring-0 p-0 outline-none font-bold ${isLate ? 'text-rose-500' : 'text-slate-600'}`} />
                  </td>
                  <td className="px-6 py-4">
                    <input type="number" value={task.estimatedCost || ''} onChange={(e) => onUpdate(task.id, { estimatedCost: Number(e.target.value) })} className="w-full text-xs font-mono font-bold bg-slate-50 rounded px-2 py-1 outline-none border border-transparent focus:border-indigo-200" placeholder="0" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => onDelete(task.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskTable;
