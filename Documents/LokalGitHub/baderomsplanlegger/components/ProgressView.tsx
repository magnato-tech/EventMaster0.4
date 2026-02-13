import React from 'react';
import { Task } from '../types';
import { formatDateNo } from '../utils/dateUtils';

interface ProgressViewProps {
  tasks: Task[];
  onOpenTaskDetail: (task: Task) => void;
}

const ProgressView: React.FC<ProgressViewProps> = ({ tasks, onOpenTaskDetail }) => {
  const milestones = tasks.filter(t => t.isMilestone).sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
  
  // Finn oppgaver som ikke tilhører en milepæl
  const unassignedTasks = tasks.filter(t => !t.isMilestone && !t.parentMilestoneId).sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));

  return (
    <div className="space-y-16 py-8">
      {/* Vis uassignede oppgaver først hvis de finnes */}
      {unassignedTasks.length > 0 && (
        <section className="relative pl-8">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 rounded-full"></div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Uavhengige Oppgaver</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {unassignedTasks.map(task => <TaskCard key={task.id} task={task} allTasks={tasks} onOpenTaskDetail={onOpenTaskDetail} />)}
            </div>
        </section>
      )}

      {/* Vis hver milepæl som en fase */}
      {milestones.map((milestone) => {
        const phaseTasks = tasks.filter(t => t.parentMilestoneId === milestone.id).sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
        const completedCount = phaseTasks.filter(t => t.isDone).length;
        const totalCount = phaseTasks.length;
        const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : (milestone.isDone ? 100 : 0);

        return (
          <section key={milestone.id} className="relative pl-12 group">
            {/* Vertikal linje */}
            <div className="absolute left-4 top-8 bottom-[-64px] w-0.5 bg-slate-200 group-last:hidden"></div>
            
            {/* Milepæl-punkt */}
            <div className="absolute left-0 top-0 w-8 h-8 rounded-xl bg-indigo-600 border-4 border-white shadow-lg shadow-indigo-200 flex items-center justify-center z-10 rotate-45 group-hover:scale-110 transition-transform">
               <span className="text-white font-bold text-xs -rotate-45">◆</span>
            </div>
            
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Fase fullført: {milestone.plannedDate}</span>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{milestone.title}</h2>
                </div>
                {totalCount > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm flex items-center gap-4">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fase-fremdrift:</div>
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="text-xs font-black text-slate-800">{progress}%</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {phaseTasks.map(task => (
                    <TaskCard key={task.id} task={task} allTasks={tasks} onOpenTaskDetail={onOpenTaskDetail} />
                ))}
                {phaseTasks.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex items-center justify-center text-slate-400 text-xs font-bold uppercase italic">
                        Ingen oppgaver knyttet til denne fasen
                    </div>
                )}
            </div>
          </section>
        );
      })}
    </div>
  );
};

// Properly typed TaskCard component to handle React's internal props like key
const TaskCard: React.FC<{ task: Task, allTasks: Task[], onOpenTaskDetail: (task: Task) => void }> = ({ task, allTasks, onOpenTaskDetail }) => {
    const predecessor = allTasks.find(t => t.id === task.predecessorId);
    return (
        <div 
            className={`p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden cursor-pointer ${task.isDone ? 'opacity-60 bg-slate-50/50 grayscale' : ''}`}
            onClick={() => onOpenTaskDetail(task)}
        >            {task.isDone && (
                <div className="absolute top-0 right-0 p-2">
                    <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">OK</span>
                </div>
            )}
            <div className="flex flex-col gap-3">
                <div>
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{task.category}</span>
                        <span className="text-[9px] font-mono font-bold text-slate-500">{task.plannedDate}</span>
                    </div>
                    <h4 className={`text-sm font-bold ${task.isDone ? 'line-through text-slate-500' : 'text-slate-800'}`}>{task.title}</h4>
                </div>
                
                {predecessor && (
                    <div className="flex items-center gap-1.5 text-[9px] text-indigo-500 font-bold bg-indigo-50 px-2 py-1 rounded-lg w-fit">
                        <span>🔗 Etter:</span>
                        <span className="truncate max-w-[140px] italic">{predecessor.title}</span>
                    </div>
                )}

                {task.estimatedCost ? (
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Kostnad</span>
                        <span className="text-xs font-mono font-bold text-slate-700">{new Intl.NumberFormat('no-NO').format(task.estimatedCost)} kr</span>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ProgressView;
