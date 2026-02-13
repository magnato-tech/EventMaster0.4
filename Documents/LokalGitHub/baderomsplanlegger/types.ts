
export type TaskCategory = 'Ledelse' | 'Teknisk' | 'Praktisk' | 'Planlegging' | 'Logistikk' | 'Annet';

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string; // e.g., "pcs", "meter", "liter"
  unitCost: number;
  totalCost: number; // quantity * unitCost
  supplier?: string;
  purchaseDate?: string; // When was it bought?
  deliveryDate?: string; // When is it expected?
  isPurchased: boolean;
  taskId: string; // Link back to the task it belongs to
  notes?: string; // Additional notes, e.g., link to store or explanation
}

export interface Task {
  id: string;
  title: string;
  plannedDate: string; // ISO string YYYY-MM-DD
  isDone: boolean;
  category: TaskCategory;
  isMilestone?: boolean;
  estimatedCost?: number;
  notes?: string;
  predecessorId?: string; // Logisk: Hva må skje FØR denne?
  parentMilestoneId?: string; // Strukturell: Hvilken fase tilhører denne?
  materials?: MaterialItem[]; // Array of materials needed for this task
}

export interface ProjectStats {
  total: number;
  completed: number;
  remaining: number;
  percent: number;
  totalBudget: number;
}
