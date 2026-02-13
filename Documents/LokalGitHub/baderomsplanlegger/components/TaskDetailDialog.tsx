import React, { useState, useEffect } from 'react';
import { Task, MaterialItem, TaskCategory } from '../types';
import { getTodayStr } from '../utils/dateUtils';

interface TaskDetailDialogProps {
  task: Task | null;
  onClose: () => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onUpdateMaterial: (materialId: string, taskId: string, updates: Partial<MaterialItem>) => void;
  onAddMaterial: (taskId: string, material: Omit<MaterialItem, 'id' | 'taskId' | 'totalCost'>) => void;
  onDeleteMaterial: (materialId: string, taskId: string) => void;
}

const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({ 
  task,
  onClose,
  onUpdateTask,
  onUpdateMaterial,
  onAddMaterial,
  onDeleteMaterial
}) => {
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialQuantity, setNewMaterialQuantity] = useState(1);
  const [newMaterialUnitCost, setNewMaterialUnitCost] = useState(0);
  const [newMaterialUnit, setNewMaterialUnit] = useState('stk');
  const [newMaterialNotes, setNewMaterialNotes] = useState('');

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  if (!editedTask) return null;

  const handleTaskChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (editedTask) {
      setEditedTask({
        ...editedTask,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      });
    }
  };

  const handleMaterialChange = (materialId: string, updates: Partial<MaterialItem>) => {
    if (editedTask) {
      onUpdateMaterial(materialId, editedTask.id, updates);
    }
  };

  const handleAddMaterial = () => {
    if (editedTask && newMaterialName.trim() !== '') {
      onAddMaterial(editedTask.id, {
        name: newMaterialName.trim(),
        quantity: newMaterialQuantity,
        unit: newMaterialUnit,
        unitCost: newMaterialUnitCost,
        isPurchased: false,
        notes: newMaterialNotes.trim(),
      });
      setNewMaterialName('');
      setNewMaterialQuantity(1);
      setNewMaterialUnitCost(0);
      setNewMaterialUnit('stk');
      setNewMaterialNotes('');
    }
  };

  const handleDeleteMaterial = (materialId: string) => {
    if (editedTask) {
      onDeleteMaterial(materialId, editedTask.id);
      setEditedTask(prevEditedTask => ({
        ...prevEditedTask!,
        materials: prevEditedTask!.materials?.filter(material => material.id !== materialId),
      }));
    }
  };

  const handleSave = () => {
    if (editedTask) {
      onUpdateTask(editedTask.id, editedTask);
      onClose();
    }
  };

  const taskCategories: TaskCategory[] = ['Ledelse', 'Teknisk', 'Praktisk', 'Planlegging', 'Logistikk', 'Annet'];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center px-4 py-6 z-50" onClick={onClose}>
      <div 
        className="relative p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()} // Prevent dialog close when clicking inside
      >
        <h3 className="text-xl font-bold mb-4">Oppgavedetaljer: {editedTask.title}</h3>

        {/* Task Details */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tittel</label>
            <input type="text" name="title" value={editedTask.title} onChange={handleTaskChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Planlagt Dato</label>
            <input type="date" name="plannedDate" value={editedTask.plannedDate} onChange={handleTaskChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Kategori</label>
            <select name="category" value={editedTask.category} onChange={handleTaskChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              {taskCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Estimert Kostnad</label>
            <input type="number" name="estimatedCost" value={editedTask.estimatedCost || 0} onChange={handleTaskChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          <div className="flex items-center mt-1">
            <input type="checkbox" name="isDone" checked={editedTask.isDone} onChange={handleTaskChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
            <label className="ml-2 block text-sm text-gray-900">Ferdig</label>
          </div>
          <div className="flex items-center mt-1">
            <input type="checkbox" name="isMilestone" checked={editedTask.isMilestone} onChange={handleTaskChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
            <label className="ml-2 block text-sm text-gray-900">Milepæl</label>
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700">Notater</label>
          <textarea name="notes" value={editedTask.notes || ''} onChange={handleTaskChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></textarea>
        </div>

        {/* Materials List */}
        <h4 className="text-lg font-bold mb-3">Nødvendige Innkjøp</h4>
        {editedTask.materials && editedTask.materials.length > 0 ? (
          <ul className="space-y-3 mb-6">
            {editedTask.materials.map(item => (
              <li key={item.id} className="p-3 border rounded-md bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <input 
                    type="checkbox" 
                    checked={item.isPurchased}
                    onChange={() => handleMaterialChange(item.id, { isPurchased: !item.isPurchased })}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded mr-2"
                  />
                  <input type="text" value={item.name} onChange={(e) => handleMaterialChange(item.id, { name: e.target.value })} className="font-medium flex-grow mr-2 border-none bg-transparent" />
                  <button onClick={() => handleDeleteMaterial(item.id)} className="text-red-500 hover:text-red-700">Slett</button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Antall ({item.unit})</label>
                    <input type="number" value={item.quantity} onChange={(e) => handleMaterialChange(item.id, { quantity: parseFloat(e.target.value) })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Enhetspris</label>
                    <input type="number" value={item.unitCost} onChange={(e) => handleMaterialChange(item.id, { unitCost: parseFloat(e.target.value) })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Total Kostnad</label>
                    <p className="mt-1 p-1 block w-full bg-gray-100 rounded-md">{item.totalCost},-</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Kommentar/Link</label>
                  <textarea value={item.notes || ''} onChange={(e) => handleMaterialChange(item.id, { notes: e.target.value })} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-1"></textarea>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 mb-6">Ingen innkjøp registrert for denne oppgaven.</p>
        )}

        {/* Add New Material */}
        <h4 className="text-lg font-bold mb-3">Legg til nytt innkjøp</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input type="text" placeholder="Navn" value={newMaterialName} onChange={(e) => setNewMaterialName(e.target.value)} className="col-span-2 rounded-md border border-gray-300 shadow-sm p-1.5" />
          <input type="number" placeholder="Antall" value={newMaterialQuantity} onChange={(e) => setNewMaterialQuantity(parseFloat(e.target.value))} className="rounded-md border border-gray-300 shadow-sm p-1.5" />
          <input type="text" placeholder="Enhet (stk, m, l)" value={newMaterialUnit} onChange={(e) => setNewMaterialUnit(e.target.value)} className="rounded-md border border-gray-300 shadow-sm p-1.5" />
          <input type="number" placeholder="Enhetspris" value={newMaterialUnitCost} onChange={(e) => setNewMaterialUnitCost(parseFloat(e.target.value))} className="rounded-md border border-gray-300 shadow-sm p-1.5" />
          <textarea placeholder="Kommentar (Butikk/Lenke/Forklaring)" value={newMaterialNotes} onChange={(e) => setNewMaterialNotes(e.target.value)} rows={2} className="col-span-4 rounded-md border border-gray-300 shadow-sm p-1.5"></textarea>
        </div>
        <button onClick={handleAddMaterial} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Legg til Innkjøp</button>

        {/* Actions */}
        <div className="flex justify-end space-x-4 mt-6">
          <button onClick={onClose} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400">Avbryt</button>
          <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Lagre</button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailDialog;
