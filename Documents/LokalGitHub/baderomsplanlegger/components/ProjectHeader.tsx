
import React, { useState, useRef } from 'react';
import { ProjectStats } from '../types';

interface ProjectHeaderProps {
  stats: ProjectStats;
  onShift: (days: number) => void;
  onAdd: () => void;
  onAddMilestone: () => void;
  onAIAction: (prompt: string, fileContent?: string) => void;
  isGenerating: boolean;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({ stats, onShift, onAdd, onAddMilestone, onAIAction, isGenerating }) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      onAIAction("Filimport", text);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="bg-white border-b shadow-sm sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 italic">
              <span className="bg-indigo-600 text-white px-2 py-0.5 rounded not-italic">BYGGE</span>LEDER
            </h1>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 max-w-xl">
                <input 
                    type="text" 
                    placeholder="Beskriv prosjekt eller lim inn tekst..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                />
                <div className="flex gap-2">
                    <button 
                        onClick={() => onAIAction(aiPrompt || 'Standard prosjekt')}
                        disabled={isGenerating}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isGenerating ? 'Prosesserer...' : '🪄 Generer'}
                    </button>
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isGenerating}
                        className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center gap-2 border border-slate-200"
                        title="Importer oppgaver fra tekstfil eller CSV"
                    >
                        📎 <span className="hidden sm:inline">Importer</span>
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept=".txt,.csv,.json,.md"
                    />
                </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Forskyv:</span>
              <button onClick={() => onShift(1)} className="bg-white shadow-sm border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all">+1d</button>
              <button onClick={() => onShift(7)} className="bg-white shadow-sm border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all">+7d</button>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={onAddMilestone}
                className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-sm border border-amber-200 shadow-sm"
              >
                ◆ Milepæl
              </button>
              <button 
                onClick={onAdd}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 text-sm"
              >
                + Oppgave
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Gjennomført</div>
            <div className="text-xl font-bold text-slate-800">{stats.completed} / {stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Budsjett</div>
            <div className="text-xl font-bold text-slate-800">{new Intl.NumberFormat('no-NO').format(stats.totalBudget)} kr</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm col-span-2">
            <div className="flex justify-between items-center mb-2">
                <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Progresjon</div>
                <div className="text-sm font-bold text-indigo-600">{stats.percent}%</div>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${stats.percent}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ProjectHeader;
