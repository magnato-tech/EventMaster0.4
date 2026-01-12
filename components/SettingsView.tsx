
import React from 'react';
import { Settings, X } from 'lucide-react';

export type ColumnKey = 
  | 'name' 
  | 'role' 
  | 'age' 
  | 'status' 
  | 'memberSince' 
  | 'postalCode' 
  | 'phone';

export interface ColumnSettings {
  name: boolean;
  role: boolean;
  age: boolean;
  status: boolean;
  memberSince: boolean;
  postalCode: boolean;
  phone: boolean;
}

interface SettingsViewProps {
  isOpen: boolean;
  onClose: () => void;
  columnSettings: ColumnSettings;
  onColumnSettingsChange: (settings: ColumnSettings) => void;
}

const COLUMN_LABELS: Record<ColumnKey, string> = {
  name: 'Navn',
  role: 'Rolle',
  age: 'Alder',
  status: 'Status (Medlem/Ikke-medlem)',
  memberSince: 'Medlem Siden',
  postalCode: 'Postnr',
  phone: 'Mobil'
};

const SettingsView: React.FC<SettingsViewProps> = ({
  isOpen,
  onClose,
  columnSettings,
  onColumnSettingsChange
}) => {
  if (!isOpen) return null;

  const handleToggle = (key: ColumnKey) => {
    onColumnSettingsChange({
      ...columnSettings,
      [key]: !columnSettings[key]
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Kolonneinnstillinger</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={18} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            Velg hvilke kolonner som skal vises i persontabellen:
          </p>
          
          <div className="space-y-3">
            {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((key) => (
              <label
                key={key}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={columnSettings[key]}
                  onChange={() => handleToggle(key)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-slate-900">
                  {COLUMN_LABELS[key]}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-semibold"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;


