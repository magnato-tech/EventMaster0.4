import React from 'react';
import { MaterialItem, Task } from '../types';

interface PurchaseListViewProps {
  materialOverview: { 
    allMaterials: MaterialItem[];
    byMilestone: { [milestoneId: string]: MaterialItem[]; };
  };
  tasks: Task[]; // To get milestone titles
  onUpdateMaterial: (materialId: string, taskId: string, updates: Partial<MaterialItem>) => void;
}

const PurchaseListView: React.FC<PurchaseListViewProps> = ({ materialOverview, tasks, onUpdateMaterial }) => {
  const getMilestoneTitle = (milestoneId: string) => {
    const milestone = tasks.find(t => t.id === milestoneId && t.isMilestone);
    return milestone ? milestone.title : 'Ukjent Milepæl';
  };

  const handleTogglePurchased = (materialId: string, taskId: string, isPurchased: boolean) => {
    onUpdateMaterial(materialId, taskId, { isPurchased });
  };

  const handleQuantityChange = (materialId: string, taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseFloat(e.target.value);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      onUpdateMaterial(materialId, taskId, { quantity: newQuantity });
    }
  };

  const handleUnitCostChange = (materialId: string, taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const newUnitCost = parseFloat(e.target.value);
    if (!isNaN(newUnitCost) && newUnitCost >= 0) {
      onUpdateMaterial(materialId, taskId, { unitCost: newUnitCost });
    }
  };

  const handleNotesChange = (materialId: string, taskId: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateMaterial(materialId, taskId, { notes: e.target.value });
  };

  const totalProjectCost = materialOverview.allMaterials.reduce((sum, item) => sum + item.totalCost, 0);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">🛒 Innkjøpsliste</h2>

      {Object.keys(materialOverview.byMilestone).length === 0 ? (
        <p className="text-slate-500">Ingen materialer registrert for innkjøp enda.</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(materialOverview.byMilestone).map(([milestoneId, materials]) => (
            <div key={milestoneId} className="border-b pb-6 last:border-b-0 last:pb-0">
              <h3 className="text-xl font-semibold text-indigo-700 mb-4">{getMilestoneTitle(milestoneId)}</h3>
              <ul className="space-y-2">
                {materials.map(item => {
                  const currentMaterial = tasks.find(t => t.id === item.taskId)?.materials?.find(m => m.id === item.id) || item;
                  return (
                    <li key={item.id} className="block p-4 bg-slate-50 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            checked={currentMaterial.isPurchased}
                            onChange={() => handleTogglePurchased(item.id, item.taskId, !currentMaterial.isPurchased)}
                            className="mr-3 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <p className="font-medium text-slate-700">{currentMaterial.name}</p>
                        </div>
                        <span className="text-slate-500 text-sm">Oppgave: {tasks.find(t => t.id === item.taskId)?.title}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-500">Antall ({currentMaterial.unit})</label>
                          <input 
                            type="number" 
                            value={currentMaterial.quantity}
                            onChange={(e) => handleQuantityChange(item.id, item.taskId, e)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500">Enhetspris</label>
                          <input 
                            type="number" 
                            value={currentMaterial.unitCost}
                            onChange={(e) => handleUnitCostChange(item.id, item.taskId, e)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                      </div>

                      <div className="mb-2">
                        <label className="block text-xs font-medium text-slate-500">Kommentar (Butikk/Lenke/Forklaring)</label>
                        <textarea
                          value={currentMaterial.notes || ''}
                          onChange={(e) => handleNotesChange(item.id, item.taskId, e)}
                          rows={2}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="Legg til butikk, lenke eller annen informasjon"
                        ></textarea>
                      </div>

                      <p className="text-sm font-bold text-slate-800 text-right">Total: {currentMaterial.totalCost},-</p>
                    </li>
                  );
                })}
              </ul>
              <p className="text-lg font-bold text-slate-800 mt-4">Sum for milepæl: {materials.reduce((sum, item) => sum + item.totalCost, 0)},-</p>
            </div>
          ))}

          <div className="pt-6 border-t mt-8">
            <h3 className="text-2xl font-bold text-slate-800">Total Prosjektkostnad Innkjøp: {totalProjectCost},-</h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseListView;
