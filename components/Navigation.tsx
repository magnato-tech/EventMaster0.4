
import React from 'react';
import { Home, Calendar, Users, Target, Settings, Bell, User } from 'lucide-react';

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export const SidebarItem: React.FC<NavItemProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2 rounded-md transition-all ${active ? 'bg-indigo-50 text-indigo-700 font-bold text-sm border border-indigo-100 shadow-sm' : 'text-slate-600 hover:bg-slate-50 text-sm font-medium border border-transparent'}`}
  >
    <span className={active ? 'text-indigo-600' : 'text-slate-400'}>{icon}</span>
    <span>{label}</span>
  </button>
);

export const MobileNavItem: React.FC<NavItemProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-md transition-all ${active ? 'text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <span className={active ? 'scale-110' : ''}>{icon}</span>
    <span className="text-[10px] font-bold tracking-tight">{label}</span>
  </button>
);

const Navigation = () => {
  return null; // Used only as a placeholder for types in this architecture
};

export default Navigation;
