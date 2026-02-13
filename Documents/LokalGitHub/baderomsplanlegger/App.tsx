import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Task, TaskCategory, MaterialItem } from './types';
import { getTodayStr, addDays, isBeforeToday } from './utils/dateUtils';
import ProjectHeader from './components/ProjectHeader';
import TaskTable from './components/TaskTable';
import ProgressView from './components/ProgressView';
import PurchaseListView from './components/PurchaseListView';
import TaskDetailDialog from './components/TaskDetailDialog';

const LOCAL_STORAGE_KEY = 'byggeleder_pro_tasks_v3';

const MOCKUP_BATHROOM_PLAN: Task[] = [
  { id: 'm1', title: 'MILEPÆL 1: Råbygg, Riving og Rør (Mars)', plannedDate: getTodayStr(), isDone: false, category: 'Ledelse', isMilestone: true, estimatedCost: 0 },
  { id: 't1_1', title: 'Flytte utstyr til bod, sette opp hyller', plannedDate: getTodayStr(), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1' },
  { id: 't1_2', title: 'Montere utstyr på vegg i bod', plannedDate: getTodayStr(), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_1', materials: [
    { id: 'mat1_1', name: 'Hylleknekter', quantity: 8, unit: 'stk', unitCost: 25, totalCost: 200, isPurchased: false, taskId: 't1_2' },
    { id: 'mat1_2', name: 'Hylleplater', quantity: 4, unit: 'stk', unitCost: 100, totalCost: 400, isPurchased: false, taskId: 't1_2' },
  ] },
  { id: 't1_3', title: 'Rive plater innervegger (sør/nord) og gulv vindfang', plannedDate: getTodayStr(), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_2' },
  { id: 't1_4', title: 'Kjøre avfall til miljøstasjon', plannedDate: getTodayStr(), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_3' },
  { id: 't1_5', title: 'Planlegging av el-anlegg', plannedDate: getTodayStr(), isDone: false, category: 'Planlegging', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_4' },
  { id: 't1_6', title: 'Innkjøp (Vindu, sluk, sparkel, isopor, trelast)', plannedDate: addDays(getTodayStr(), 7), isDone: false, category: 'Logistikk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_5', materials: [
    { id: 'mat1_3', name: 'Vindu', quantity: 1, unit: 'stk', unitCost: 3000, totalCost: 3000, isPurchased: false, taskId: 't1_6' },
    { id: 'mat1_4', name: 'Sluk', quantity: 1, unit: 'stk', unitCost: 500, totalCost: 500, isPurchased: false, taskId: 't1_6' },
    { id: 'mat1_5', name: 'Sparkel', quantity: 2, unit: 'spann', unitCost: 200, totalCost: 400, isPurchased: false, taskId: 't1_6' },
    { id: 'mat1_6', name: 'Isopor', quantity: 10, unit: 'stk', unitCost: 50, totalCost: 500, isPurchased: false, taskId: 't1_6' },
    { id: 'mat1_7', name: 'Trelast', quantity: 20, unit: 'meter', unitCost: 30, totalCost: 600, isPurchased: false, taskId: 't1_6' },
  ] },
  { id: 't1_7', title: 'Merke opp slisser i gulv (kritt/spray)', plannedDate: addDays(getTodayStr(), 7), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_6' },
  { id: 't1_8', title: 'Befaring med rørlegger (se på avløp)', plannedDate: addDays(getTodayStr(), 7), isDone: false, category: 'Planlegging', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_7' },
  { id: 't1_9', title: 'Få estimert pris fra rørlegger', plannedDate: addDays(getTodayStr(), 7), isDone: false, category: 'Planlegging', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_8' },
  { id: 't1_10', title: 'Slisse og pigge opp betongen', plannedDate: addDays(getTodayStr(), 14), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_9' },
  { id: 't1_11', title: 'Bære ut masser til deponi (Dugnad!)', plannedDate: addDays(getTodayStr(), 14), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_10' },
  { id: 't1_12', title: 'Plannere ut fall i gulv og skjære spor ut av huset', plannedDate: addDays(getTodayStr(), 14), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_11' },
  { id: 't1_13', title: 'Bolte fast bunnsviller med sullpapp', plannedDate: addDays(getTodayStr(), 21), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_12' },
  { id: 't1_14', title: 'Bygge stenderverk mot mur og mellom bad/kjøkken', plannedDate: addDays(getTodayStr(), 21), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_13' },
  { id: 't1_15', title: 'Legge rør i grunn og gjennom stendere', plannedDate: addDays(getTodayStr(), 28), isDone: false, category: 'Teknisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_14' },
  { id: 't1_16', title: 'Montere linjesluk med veggbraketter', plannedDate: addDays(getTodayStr(), 28), isDone: false, category: 'Teknisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_15' },
  { id: 't1_17', title: 'Trekke rør i åpne stendere', plannedDate: addDays(getTodayStr(), 28), isDone: false, category: 'Teknisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_16' },
  { id: 't1_18', title: 'Montere kryssfiner-forskaling og tette (Tec7)', plannedDate: addDays(getTodayStr(), 28), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_17' },
  { id: 't1_19', title: 'Forskale og støpe ytre mur (bore hull/jern)', plannedDate: addDays(getTodayStr(), 28), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm1', predecessorId: 't1_18' },

  { id: 'm2', title: 'MILEPÆL 2: Isolering og Grovstøp (April)', plannedDate: addDays(getTodayStr(), 35), isDone: false, category: 'Ledelse', isMilestone: true, estimatedCost: 0, predecessorId: 't1_19' },
  { id: 't2_1', title: 'Legge EPS kjøkken (vannrett)', plannedDate: addDays(getTodayStr(), 35), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm2' },
  { id: 't2_2', title: 'Legge EPS bad (med 1cm/m fall)', plannedDate: addDays(getTodayStr(), 35), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm2', predecessorId: 't2_1' },
  { id: 't2_3', title: 'Bruke byggskum i overganger, sjekke kantbånd', plannedDate: addDays(getTodayStr(), 42), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm2', predecessorId: 't2_2' },
  { id: 't2_4', title: 'Rigge blandestasjon og bære inn 112 sekker', plannedDate: addDays(getTodayStr(), 42), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm2', predecessorId: 't2_3' },
  { id: 't2_5', title: 'Støpe Påstøp 1 (Kjøkken lørdag, Bad søndag)', plannedDate: addDays(getTodayStr(), 42), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm2', predecessorId: 't2_4' },

  { id: 'm3', title: 'MILEPÆL 3: Infrastruktur og Overflater (Mai)', plannedDate: addDays(getTodayStr(), 49), isDone: false, category: 'Ledelse', isMilestone: true, estimatedCost: 0, predecessorId: 't2_5' },
  { id: 't3_1', title: 'Sjekke bokshøyder og finpusse fall med laser', plannedDate: addDays(getTodayStr(), 49), isDone: false, category: 'Teknisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm3' },
  { id: 't3_2', title: 'Støpe topplag (Kjøkken vater / Bad fall)', plannedDate: addDays(getTodayStr(), 49), isDone: false, category: 'Teknisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm3', predecessorId: 't3_1' },
  { id: 't3_3', title: 'Dusjsone nedsenk og rist-montering', plannedDate: addDays(getTodayStr(), 49), isDone: false, category: 'Teknisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm3', predecessorId: 't3_2' },
  { id: 't3_4', title: 'Legge kantbånd og kryssfiner-topp', plannedDate: addDays(getTodayStr(), 56), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm3', predecessorId: 't3_3' },
  { id: 't3_5', title: 'Legge varmekabler', plannedDate: addDays(getTodayStr(), 56), isDone: false, category: 'Teknisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm3', predecessorId: 't3_4' },
  { id: 't3_6', title: 'Lim fast stengeliste dusjsone', plannedDate: addDays(getTodayStr(), 56), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm3', predecessorId: 't3_5' },
  { id: 't3_7', title: 'Montere Litex/Tetti-plater (utsparinger for el/rør)', plannedDate: addDays(getTodayStr(), 63), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm3', predecessorId: 't3_6' },
  { id: 't3_8', title: 'Smøremembran vegger og gulv (mansjetter)', plannedDate: addDays(getTodayStr(), 70), isDone: false, category: 'Teknisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm3', predecessorId: 't3_7' },
  { id: 't3_9', title: 'Flislegge vegger og fuge', plannedDate: addDays(getTodayStr(), 70), isDone: false, category: 'Teknisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm3', predecessorId: 't3_8' },
  { id: 't3_10', title: 'Flislegge baderomsgulv (tilpasning sluk)', plannedDate: addDays(getTodayStr(), 84), isDone: false, category: 'Teknisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm3', predecessorId: 't3_9' },
  { id: 't3_11', title: 'Fuging, vasking og silikonering', plannedDate: addDays(getTodayStr(), 84), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm3', predecessorId: 't3_10' },
  { id: 't3_12', title: 'Grundig rengjøring (støvfritt)', plannedDate: addDays(getTodayStr(), 84), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm3', predecessorId: 't3_11' },
  { id: 't3_13', title: 'Reise 198mm stendere på fundament', plannedDate: addDays(getTodayStr(), 91), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm3', predecessorId: 't3_12' },
  { id: 't3_14', title: 'Skjære hull, montere vinduer og dampsperre', plannedDate: addDays(getTodayStr(), 91), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm3', predecessorId: 't3_13' },
  { id: 't3_15', title: 'Utvendig isolasjon, vindsperre og kledning', plannedDate: addDays(getTodayStr(), 91), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm3', predecessorId: 't3_14' },

  { id: 'm4', title: 'MILEPÆL 4: Innredning og Ferdigstillelse (Juni)', plannedDate: addDays(getTodayStr(), 105), isDone: false, category: 'Ledelse', isMilestone: true, estimatedCost: 0, predecessorId: 't3_15' },
  { id: 't4_1', title: 'Montere kjøkkenmoduler, servant og toalett', plannedDate: addDays(getTodayStr(), 105), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm4' },
  { id: 't4_2', title: 'Siste tekniske koblinger', plannedDate: addDays(getTodayStr(), 105), isDone: false, category: 'Teknisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm4', predecessorId: 't4_1' },
  { id: 't4_3', title: 'Grave grøft utvendig', plannedDate: addDays(getTodayStr(), 112), isDone: false, category: 'Praktisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm4', predecessorId: 't4_2' },
  { id: 't4_4', title: 'Koble på avløpsrør ute', plannedDate: addDays(getTodayStr(), 112), isDone: false, category: 'Teknisk', isMilestone: false, estimatedCost: 0, parentMilestoneId: 'm4', predecessorId: 't4_3' },
];

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'table' | 'timeline' | 'purchases'>('table');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved && JSON.parse(saved).length > 0) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        setTasks(MOCKUP_BATHROOM_PLAN);
      }
    } else {
      setTasks(MOCKUP_BATHROOM_PLAN);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const cascadeShift = useCallback((allTasks: Task[], changedTaskId: string, newDate: string): Task[] => {
    let updatedTasks = [...allTasks];
    const taskIndex = updatedTasks.findIndex(t => t.id === changedTaskId);
    if (taskIndex === -1) return allTasks;
    
    const oldDate = updatedTasks[taskIndex].plannedDate;
    updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], plannedDate: newDate };

    const dependents = updatedTasks.filter(t => t.predecessorId === changedTaskId);
    dependents.forEach(dep => {
      if (dep.plannedDate < newDate) {
        const diffTime = new Date(newDate).getTime() - new Date(oldDate).getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const shiftedDate = addDays(dep.plannedDate, diffDays);
        updatedTasks = cascadeShift(updatedTasks, dep.id, shiftedDate);
      }
    });

    return updatedTasks;
  }, []);

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => {
      if (updates.plannedDate) {
        return cascadeShift(prev, id, updates.plannedDate);
      }
      return prev.map(t => t.id === id ? { ...t, ...updates } : t);
    });
  };

  const autoSyncOverdueTasks = useCallback(() => {
    const today = getTodayStr();
    const overdue = tasks.filter(t => !t.isDone && isBeforeToday(t.plannedDate));
    
    if (overdue.length > 0) {
      if (window.confirm(`Flytt ${overdue.length} forsinkede oppgaver til i dag? Dette vil også forskyve alle avhengige ledd.`)) {
        let currentTasks = [...tasks];
        overdue.forEach(t => {
          currentTasks = cascadeShift(currentTasks, t.id, today);
        });
        setTasks(currentTasks);
      }
    }
  }, [tasks, cascadeShift]);

  const [hasCheckedOverdue, setHasCheckedOverdue] = useState(false);
  useEffect(() => {
    if (tasks.length > 0 && !hasCheckedOverdue) {
      autoSyncOverdueTasks();
      setHasCheckedOverdue(true);
    }
  }, [tasks, autoSyncOverdueTasks, hasCheckedOverdue]);

  const shiftIncompleteTasks = (days: number) => {
    setTasks(prev => prev.map(task => {
      if (!task.isDone) {
        return { ...task, plannedDate: addDays(task.plannedDate, days) };
      }
      return task;
    }));
  };

  const processAIRequest = async (prompt: string, fileContent?: string) => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt + (fileContent ? ` Filinnhold: ${fileContent}` : ""),
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                category: { type: Type.STRING, enum: ['Ledelse', 'Teknisk', 'Praktisk', 'Planlegging', 'Logistikk', 'Annet'] },
                dayOffset: { type: Type.NUMBER },
                isMilestone: { type: Type.BOOLEAN }
              },
              required: ["title", "category", "dayOffset"]
            }
          }
        }
      });

      const newTasksRaw = JSON.parse(response.text);
      const today = getTodayStr();
      const generatedTasks: Task[] = newTasksRaw.map((t: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        title: t.title,
        category: t.category as TaskCategory,
        plannedDate: addDays(today, t.dayOffset || 0),
        isDone: false,
        isMilestone: !!t.isMilestone,
        estimatedCost: 0
      }));

      if (window.confirm(`Legg til ${generatedTasks.length} genererte oppgaver?`)) {
        setTasks(prev => [...prev, ...generatedTasks]);
      }
    } catch (error) {
      alert("Feil ved AI-generering.");
    } finally {
      setIsGenerating(false);
    }
  };

  const addTask = (isMilestone: boolean = false) => {
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: isMilestone ? 'Ny Milepæl / Fase' : 'Ny oppgave',
      plannedDate: getTodayStr(),
      isDone: false,
      category: isMilestone ? 'Ledelse' : 'Annet',
      isMilestone,
      estimatedCost: 0
    };
    setTasks([...tasks, newTask]);
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id).map(t => {
        let update = { ...t };
        if (t.predecessorId === id) update.predecessorId = undefined;
        if (t.parentMilestoneId === id) update.parentMilestoneId = undefined;
        return update;
    }));
  };

  const handleOpenTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailDialogOpen(true);
  };

  const handleCloseTaskDetail = () => {
    setSelectedTask(null);
    setIsDetailDialogOpen(false);
  };

  const onAddMaterial = useCallback((taskId: string, material: Omit<MaterialItem, 'id' | 'taskId' | 'totalCost'>) => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId) {
        const newMaterial: MaterialItem = {
          ...material,
          id: Math.random().toString(36).substr(2, 9),
          taskId,
          totalCost: material.quantity * material.unitCost,
        };
        return { ...task, materials: task.materials ? [...task.materials, newMaterial] : [newMaterial] };
      }
      return task;
    }));
  }, []);

  const onDeleteMaterial = useCallback((materialId: string, taskId: string) => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId && task.materials) {
        return { ...task, materials: task.materials.filter(material => material.id !== materialId) };
      }
      return task;
    }));
  }, []);

  const updateMaterial = useCallback((materialId: string, taskId: string, updates: Partial<MaterialItem>) => {
    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id === taskId && task.materials) {
          const updatedMaterials = task.materials.map(material => {
            if (material.id === materialId) {
              const newMaterial = { ...material, ...updates };
              // Recalculate totalCost if quantity or unitCost changes
              if (updates.quantity !== undefined || updates.unitCost !== undefined) {
                newMaterial.totalCost = newMaterial.quantity * newMaterial.unitCost;
              }
              return newMaterial;
            }
            return material;
          });
          return { ...task, materials: updatedMaterials };
        }
        return task;
      });
    });
  }, []);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.isDone).length;
    const totalBudget = tasks.reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
    return { total, completed, remaining: total - completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0, totalBudget };
  }, [tasks]);

  const materialOverview = useMemo(() => {
    const overview: { [milestoneId: string]: MaterialItem[] } = {};
    const allMaterials: MaterialItem[] = [];

    tasks.forEach(task => {
      if (task.materials && task.materials.length > 0) {
        task.materials.forEach(material => {
          allMaterials.push(material); // Add to a flat list for overall view

          // Group by milestone
          const milestoneId = task.parentMilestoneId;
          if (milestoneId) {
            if (!overview[milestoneId]) {
              overview[milestoneId] = [];
            }
            overview[milestoneId].push(material);
          }
        });
      }
    });

    return { allMaterials, byMilestone: overview };
  }, [tasks]);

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <ProjectHeader stats={stats} onShift={shiftIncompleteTasks} onAdd={() => addTask(false)} onAddMilestone={() => addTask(true)} onAIAction={processAIRequest} isGenerating={isGenerating} />
      <main className="max-w-6xl mx-auto px-4 mt-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button onClick={() => setActiveTab('table')} className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'table' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>📋 Liste</button>
            <button onClick={() => setActiveTab('timeline')} className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'timeline' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>📅 Faser / Tidslinje</button>
            <button onClick={() => setActiveTab('purchases')} className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'purchases' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>🛒 Innkjøp</button>

          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <h2 className="text-xl font-bold mb-4">Ingen oppgaver i planen</h2>
            <button onClick={() => addTask(false)} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">Start her</button>
          </div>
        ) : (
          activeTab === 'table' ? (
            <TaskTable tasks={tasks} onUpdate={updateTask} onDelete={deleteTask} onOpenTaskDetail={handleOpenTaskDetail} />
          ) : activeTab === 'timeline' ? (
            <ProgressView tasks={tasks} onOpenTaskDetail={handleOpenTaskDetail} />
          ) : (
            <PurchaseListView materialOverview={materialOverview} tasks={tasks} onUpdateMaterial={updateMaterial} />
          )
        )}
      </main>
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t p-4 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">Byggeleder Pro</footer>

      {isDetailDialogOpen && selectedTask && (
        <TaskDetailDialog 
          task={selectedTask}
          onClose={handleCloseTaskDetail}
          onUpdateTask={updateTask}
          onUpdateMaterial={updateMaterial}
          onAddMaterial={onAddMaterial}
          onDeleteMaterial={onDeleteMaterial}
        />
      )}
    </div>
  );
};

export default App;
