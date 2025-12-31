
export type Role = 'GERENCIA' | 'OPERADOR';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
  permissions: {
    dashboard: boolean;
    estoque: boolean;
    movimentacoes: boolean;
    enderecamento: boolean;
    relatorios: boolean;
    ajustes: boolean;
    atividades: boolean;
    gestaoDia: boolean;
    admin: boolean;
  };
}

export interface InventoryItem {
  id: string;
  sku: string;
  ean: string;
  name: string;
  category: string;
  minQuantity: number;
  currentQuantity: number;
  unitPrice: number;
  salePrice: number;
  location: {
    corridor: string;
    shelf: string;
    floor: string;
  };
  fotoUrl?: string;
  updatedAt: number;
}

export interface Customer {
  id: string; // ID Sequencial amigável (ex: C-001)
  uuid: string; // ID único de sistema
  name: string;
  doc: string;
  email: string;
  contact: string;
  createdAt: number;
}

export type MovementType = 'ENTRADA' | 'SAIDA' | 'AJUSTE';

export interface Movement {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  type: MovementType;
  quantity: number;
  userId: string;
  username: string;
  timestamp: number;
  notes?: string;
}

export interface SaleItem {
  itemId: string;
  itemName: string;
  ean: string;
  quantity: number;
  unitPrice: number; 
  salePrice: number; 
  totalPrice: number;
}

export type PaymentMethod = 'PIX' | 'DINHEIRO' | 'DEBITO' | 'CREDITO';

export interface Sale {
  id: string;
  customerId?: string;
  customerName: string;
  customerDoc: string;
  customerContact: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  installments?: number;
  interestValue?: number;
  timestamp: number;
  userId: string;
  userName: string; // Rastreabilidade do funcionário
}

export type AdjustmentStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

export interface StockAdjustment {
  id: string;
  itemId: string;
  requestedBy: string;
  requestedAt: number;
  oldQuantity: number;
  newQuantity: number;
  adjustmentType: 'ENTRADA' | 'SAIDA';
  deltaQuantity: number;
  reason: string;
  status: AdjustmentStatus;
  reviewedBy?: string;
  reviewedAt?: number;
}

export type TaskStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'RESOLVIDA';

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA';
  assignedTo?: string;
  createdAt: number;
}
