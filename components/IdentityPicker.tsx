
import React, { useState } from 'react';
import { Person, CoreRole } from '../types';
import { Search, User } from 'lucide-react';

interface Props {
  persons: Person[];
  onSelect: (person: Person) => void;
}

const IdentityPicker: React.FC<Props> = ({ persons, onSelect }) => {
  const [search, setSearch] = useState('');

  const filtered = persons.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) && p.is_active
  );

  const getCoreRoleLabel = (role: CoreRole) => {
    switch (role) {
      case CoreRole.ADMIN: return 'Administrator';
      case CoreRole.PASTOR: return 'Pastor';
      case CoreRole.TEAM_LEADER: return 'Gruppeleder';
      case CoreRole.MEMBER: return 'Medlem';
      default: return 'Gjest';
    }
  };

  return (
    <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-indigo-700 p-8 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">Velkommen</h1>
          <p className="text-indigo-100">Velg din identitet for å fortsette til EventMaster LMK.</p>
        </div>
        
        <div className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Søk på navn..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            {filtered.map(person => (
              <button 
                key={person.id}
                onClick={() => onSelect(person)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-transparent hover:border-indigo-100 hover:bg-indigo-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-indigo-200 group-hover:text-indigo-700 transition-colors">
                  <User size={20} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-800">{person.name}</p>
                  <p className="text-xs text-slate-500">{getCoreRoleLabel(person.core_role)}</p>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-slate-400 py-8">Ingen personer funnet...</p>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t text-center">
          <p className="text-xs text-slate-400 italic">"Små menigheter - sterke relasjoner"</p>
        </div>
      </div>
    </div>
  );
};

export default IdentityPicker;
