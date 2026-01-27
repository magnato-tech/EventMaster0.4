import { EventTemplate } from '../types';

export const DEFAULT_EVENT_TEMPLATES: EventTemplate[] = [
  { id: 't1', title: 'Gudstjenesteprogram Mal', type: 'Gudstjeneste', recurrence_rule: 'Hver søndag kl. 11:00', color: '#2563eb' },
  { id: 't2', title: 'Utegudstjeneste', type: 'Gudstjeneste', recurrence_rule: 'Ved behov', color: '#10b981' },
  { id: 't3', title: 'Konfirmasjon', type: 'Konfirmasjon', recurrence_rule: 'Årlig (mai)', color: '#f59e0b' },
  { id: 't4', title: 'Kulturnatta', type: 'Kultur', recurrence_rule: 'Årlig (september)', color: '#8b5cf6' }
];
