
import React, { useState, useMemo } from 'react';
import { AppState, Person, NoticeMessage, CoreRole, UUID } from '../types';
// Fix: Added ArrowRight to the imports from lucide-react
import { Bell, Send, Trash2, User, Clock, Plus, X, ShieldAlert, MessageSquare, Sparkles, Calendar, ArrowRight } from 'lucide-react';

interface Props {
  db: AppState;
  currentUser: Person;
  onAddMessage: (msg: NoticeMessage) => void;
  onDeleteMessage: (id: UUID) => void;
}

const CommunicationView: React.FC<Props> = ({ db, currentUser, onAddMessage, onDeleteMessage }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  const defaultRecipient = (currentUser.core_role === CoreRole.ADMIN || currentUser.core_role === CoreRole.PASTOR) 
    ? CoreRole.TEAM_LEADER 
    : CoreRole.PASTOR;

  const [recipient, setRecipient] = useState<CoreRole>(defaultRecipient);

  const visibleMessages = useMemo(() => {
    return (db.noticeMessages || []).filter(msg => {
      if (currentUser.core_role === CoreRole.ADMIN || currentUser.core_role === CoreRole.PASTOR) {
        return msg.sender_id === currentUser.id || msg.sender_id === 'system' || msg.recipient_role === CoreRole.PASTOR || msg.recipient_role === CoreRole.ADMIN;
      }
      if (currentUser.core_role === CoreRole.TEAM_LEADER) {
        return msg.recipient_role === CoreRole.TEAM_LEADER || msg.sender_id === currentUser.id;
      }
      return false;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [db.noticeMessages, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newMessage: NoticeMessage = {
      id: crypto.randomUUID(),
      sender_id: currentUser.id,
      recipient_role: recipient,
      title,
      content,
      created_at: new Date().toISOString()
    };

    onAddMessage(newMessage);
    setIsModalOpen(false);
    setTitle('');
    setContent('');
  };

  const getRoleLabel = (role: CoreRole) => {
    switch (role) {
      case CoreRole.PASTOR: return 'Pastor';
      case CoreRole.ADMIN: return 'Admin';
      case CoreRole.TEAM_LEADER: return 'Gruppeledere';
      default: return 'Alle';
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Nå';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}t`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 text-left pb-20 md:pb-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="text-indigo-600" size={24} /> Oppslag & Dialog
          </h2>
          <p className="text-sm text-slate-500">Intern kommunikasjon og systemvarsler.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Ny Melding
        </button>
      </header>

      <div className="grid gap-4">
        {visibleMessages.length > 0 ? visibleMessages.map(msg => {
          const isSystem = msg.sender_id === 'system';
          const sender = isSystem ? null : db.persons.find(p => p.id === msg.sender_id);
          const isFromMe = msg.sender_id === currentUser.id;
          const linkedOcc = msg.occurrence_id ? db.eventOccurrences.find(o => o.id === msg.occurrence_id) : null;
          
          return (
            <div key={msg.id} className={`bg-white rounded-[1.5rem] border shadow-sm overflow-hidden transition-all hover:shadow-md ${isSystem ? 'border-emerald-100 bg-emerald-50/20' : isFromMe ? 'border-slate-100' : 'border-indigo-100'}`}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${isSystem ? 'bg-emerald-600 text-white' : isFromMe ? 'bg-slate-100 text-slate-600' : 'bg-indigo-600 text-white'}`}>
                      {isSystem ? <Sparkles size={20} /> : (sender?.name.charAt(0) || '?')}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm leading-none mb-1">
                        {isSystem ? 'Systemvarsel' : sender?.name} {isFromMe && <span className="text-slate-400 font-normal ml-1">(Deg)</span>}
                      </p>
                      <div className="flex items-center gap-2">
                         <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${isSystem ? 'bg-emerald-100 text-emerald-700' : isFromMe ? 'bg-slate-100 text-slate-500' : 'bg-indigo-100 text-indigo-700'}`}>
                           {isSystem ? 'Automatisk' : isFromMe ? `Til: ${getRoleLabel(msg.recipient_role)}` : getRoleLabel(sender?.core_role || CoreRole.GUEST)}
                         </span>
                         <span className="text-[10px] text-slate-400 flex items-center gap-1">
                           <Clock size={10}/> {getTimeAgo(msg.created_at)}
                         </span>
                      </div>
                    </div>
                  </div>
                  {(isFromMe || isSystem) && (
                    <button onClick={() => onDeleteMessage(msg.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                <h4 className="text-base font-bold text-slate-800 mb-2">{msg.title}</h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap mb-4">{msg.content}</p>

                {linkedOcc && (
                  <div className="mt-4 p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Calendar size={14} className="text-indigo-500" />
                      {linkedOcc.title_override || 'Gudstjeneste'} ({linkedOcc.date})
                    </div>
                    <button className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 hover:underline">
                      Vis detaljer <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4">
              <MessageSquare size={32} />
            </div>
            <p className="text-slate-400 font-bold">Ingen meldinger her ennå.</p>
            <p className="text-[11px] text-slate-400 mt-1">Når Pastor eller ledere sender ut oppslag, vil de dukke opp her.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="p-6 bg-indigo-700 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Send size={20} /> Ny Melding
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-indigo-600 rounded-xl transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Mottaker-gruppe</label>
                <select 
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value as CoreRole)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                >
                  {(currentUser.core_role === CoreRole.ADMIN || currentUser.core_role === CoreRole.PASTOR) ? (
                    <option value={CoreRole.TEAM_LEADER}>Alle Gruppeledere</option>
                  ) : (
                    <option value={CoreRole.PASTOR}>Pastor</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Overskrift</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Hva gjelder det?"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Melding</label>
                <textarea 
                  required
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Skriv din melding her..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm resize-none"
                />
              </div>

              <div className="bg-amber-50 p-4 rounded-xl flex gap-3 text-amber-700">
                <ShieldAlert size={20} className="shrink-0" />
                <p className="text-[10px] font-bold uppercase leading-relaxed">
                  Denne meldingen er intern og kun synlig for de valgte rollene.
                </p>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Send size={18} /> Send Melding
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationView;
