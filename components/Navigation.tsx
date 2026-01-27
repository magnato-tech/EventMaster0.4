
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
    className={`w-full flex items-center gap-3 px-4 py-2 rounded-theme transition-all ${active ? 'bg-primary-light text-primary font-bold text-sm border border-primary-light shadow-sm' : 'text-slate-600 hover:bg-slate-50 text-sm font-medium border border-transparent'}`}
  >
    <span className={active ? 'text-primary' : 'text-slate-400'}>{icon}</span>
    <span>{label}</span>
  </button>
);

export const MobileNavItem: React.FC<NavItemProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-theme transition-all ${active ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <span className={active ? 'scale-110' : ''}>{icon}</span>
    <span className="text-[10px] font-bold tracking-tight">{label}</span>
  </button>
);

const Navigation = () => {
  return null; // Used only as a placeholder for types in this architecture
};

export default Navigation;
