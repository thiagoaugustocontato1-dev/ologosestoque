
import { 
  InventoryItem, 
  Movement, 
  User, 
  StockAdjustment, 
  KanbanTask, 
  MovementType,
  TaskStatus,
  Sale,
  Customer,
  Role,
  AdjustmentStatus
} from '../types';

export const formatBRL = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const STORAGE_KEYS = {
  ITEMS: 'logos_items',
  MOVEMENTS: 'logos_movements',
  USERS: 'logos_users',
  SALES: 'logos_sales',
  CUSTOMERS: 'logos_customers',
  TASKS: 'logos_tasks',
  ADJUSTMENTS: 'logos_adjustments',
  SETTINGS: 'logos_settings'
};

class Database {
  private get<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }

  private set(key: string, value: any): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Usuários
  async getUsers(): Promise<User[]> {
    const users = this.get<User[]>(STORAGE_KEYS.USERS, []);
    // Garante que o usuário mestre sempre exista se a lista estiver vazia
    if (users.length === 0) {
      const master: User = {
        id: 'master-user-id',
        username: 'Thiago_Augusto',
        passwordHash: 'Genio',
        role: 'GERENCIA',
        permissions: {
          dashboard: true, gestaoDia: true, estoque: true, movimentacoes: true, 
          enderecamento: true, relatorios: true, ajustes: true, atividades: true, admin: true
        }
      };
      this.set(STORAGE_KEYS.USERS, [master]);
      return [master];
    }
    return users;
  }
  
  async addUser(user: User) {
    const users = await this.getUsers();
    users.push(user);
    this.set(STORAGE_KEYS.USERS, users);
    return user;
  }

  async updateUserPermissions(id: string, permissions: User['permissions']) {
    const users = await this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
      users[idx].permissions = permissions;
      this.set(STORAGE_KEYS.USERS, users);
    }
  }

  async updateUserRole(id: string, role: Role) {
    const users = await this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
      users[idx].role = role;
      this.set(STORAGE_KEYS.USERS, users);
    }
  }

  // Configurações
  async getInterestRate(): Promise<number> {
    const settings = this.get<any>(STORAGE_KEYS.SETTINGS, {});
    return settings.interestRate ?? 2.5;
  }

  async setInterestRate(rate: number) {
    const settings = this.get<any>(STORAGE_KEYS.SETTINGS, {});
    settings.interestRate = rate;
    this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  async getMaxDiscountRate(): Promise<number> {
    const settings = this.get<any>(STORAGE_KEYS.SETTINGS, {});
    return settings.maxDiscountRate ?? 10.0;
  }

  async setMaxDiscountRate(rate: number) {
    const settings = this.get<any>(STORAGE_KEYS.SETTINGS, {});
    settings.maxDiscountRate = rate;
    this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  // Estoque
  async getItems(): Promise<InventoryItem[]> {
    return this.get<InventoryItem[]>(STORAGE_KEYS.ITEMS, []);
  }

  async addItem(item: Omit<InventoryItem, 'id' | 'sku' | 'currentQuantity' | 'updatedAt'>) {
    const items = await this.getItems();
    const year = new Date().getFullYear();
    const count = (items.length + 1).toString().padStart(4, '0');
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const sku = `LGS-${year}-${count}-${random}`;

    const newItem: InventoryItem = {
      ...item,
      id: crypto.randomUUID(),
      sku,
      currentQuantity: 0,
      updatedAt: Date.now()
    };
    
    items.push(newItem);
    this.set(STORAGE_KEYS.ITEMS, items);
    return newItem;
  }

  async updateItem(id: string, data: Partial<InventoryItem>) {
    const items = await this.getItems();
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...data, updatedAt: Date.now() };
      this.set(STORAGE_KEYS.ITEMS, items);
    }
  }

  async deleteItem(id: string) {
    const items = await this.getItems();
    this.set(STORAGE_KEYS.ITEMS, items.filter(i => i.id !== id));
  }

  // Clientes
  async getCustomers(): Promise<Customer[]> {
    return this.get<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  }
  
  async addCustomer(c: Omit<Customer, 'id' | 'uuid' | 'createdAt'>) {
    const customers = await this.getCustomers();
    const lastId = customers.length > 0 ? parseInt(customers[customers.length-1].id.split('-')[1]) : 1000;
    
    const newCustomer: Customer = {
      ...c,
      uuid: crypto.randomUUID(),
      id: `C-${lastId + 1}`,
      createdAt: Date.now()
    };
    
    customers.push(newCustomer);
    this.set(STORAGE_KEYS.CUSTOMERS, customers);
    return newCustomer;
  }

  async updateCustomer(uuid: string, data: Partial<Customer>) {
    const customers = await this.getCustomers();
    const idx = customers.findIndex(c => c.uuid === uuid);
    if (idx !== -1) {
      customers[idx] = { ...customers[idx], ...data };
      this.set(STORAGE_KEYS.CUSTOMERS, customers);
    }
  }

  // Movimentações
  async registerMovement(userId: string, username: string, itemId: string, type: MovementType, quantity: number, notes?: string) {
    const items = await this.getItems();
    const itemIdx = items.findIndex(i => i.id === itemId);
    if (itemIdx === -1) throw new Error("Produto não localizado.");

    const item = items[itemIdx];
    let newQty = item.currentQuantity;
    
    if (type === 'ENTRADA') newQty += quantity;
    if (type === 'SAIDA' || type === 'AJUSTE') {
       if (type === 'SAIDA' && item.currentQuantity < quantity) throw new Error("Saldo insuficiente em estoque.");
       newQty = type === 'SAIDA' ? newQty - quantity : quantity;
    }

    item.currentQuantity = newQty;
    item.updatedAt = Date.now();
    this.set(STORAGE_KEYS.ITEMS, items);

    const movements = await this.getMovements();
    const movement: Movement = {
      id: crypto.randomUUID(),
      itemId,
      sku: item.sku,
      itemName: item.name,
      type,
      quantity,
      userId,
      username,
      timestamp: Date.now(),
      notes
    };

    movements.push(movement);
    this.set(STORAGE_KEYS.MOVEMENTS, movements);
    return movement;
  }

  // Vendas
  async processSale(userId: string, username: string, saleData: Omit<Sale, 'id' | 'timestamp' | 'userId' | 'userName'>) {
    for (const saleItem of saleData.items) {
      await this.registerMovement(
        userId, 
        username, 
        saleItem.itemId, 
        'SAIDA', 
        saleItem.quantity, 
        `Venda PDV para: ${saleData.customerName}`
      );
    }

    const sales = await this.getSales();
    const newSale: Sale = {
      ...saleData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      userId,
      userName: username
    };

    sales.push(newSale);
    this.set(STORAGE_KEYS.SALES, sales);
    return newSale;
  }

  async getSales(): Promise<Sale[]> {
    return this.get<Sale[]>(STORAGE_KEYS.SALES, []);
  }

  async getMovements(): Promise<Movement[]> {
    return this.get<Movement[]>(STORAGE_KEYS.MOVEMENTS, []);
  }

  // Tarefas (Kanban)
  async getTasks(): Promise<KanbanTask[]> {
    return this.get<KanbanTask[]>(STORAGE_KEYS.TASKS, []);
  }
  
  async addTask(task: Omit<KanbanTask, 'id' | 'createdAt'>) {
    const tasks = await this.getTasks();
    const newTask: KanbanTask = { ...task, id: crypto.randomUUID(), createdAt: Date.now() };
    tasks.push(newTask);
    this.set(STORAGE_KEYS.TASKS, tasks);
    return newTask;
  }

  async updateTaskStatus(id: string, status: TaskStatus) {
    const tasks = await this.getTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      tasks[idx].status = status;
      this.set(STORAGE_KEYS.TASKS, tasks);
    }
  }

  async deleteTask(id: string) {
    const tasks = await this.getTasks();
    this.set(STORAGE_KEYS.TASKS, tasks.filter(t => t.id !== id));
  }

  // Ajustes de Estoque
  async getAdjustments(): Promise<StockAdjustment[]> {
    return this.get<StockAdjustment[]>(STORAGE_KEYS.ADJUSTMENTS, []);
  }

  async requestAdjustment(adj: Omit<StockAdjustment, 'id' | 'status' | 'requestedAt'>) {
    const adjustments = await this.getAdjustments();
    const newAdj: StockAdjustment = {
      ...adj,
      id: crypto.randomUUID(),
      status: 'PENDENTE',
      requestedAt: Date.now()
    };
    adjustments.push(newAdj);
    this.set(STORAGE_KEYS.ADJUSTMENTS, adjustments);
    return newAdj;
  }

  async processAdjustment(id: string, status: AdjustmentStatus, userId: string) {
    const adjustments = await this.getAdjustments();
    const adjIdx = adjustments.findIndex(a => a.id === id);
    if (adjIdx === -1) throw new Error("Ajuste não encontrado.");

    const adj = adjustments[adjIdx];
    if (status === 'APROVADO') {
      const users = await this.getUsers();
      const reviewer = users.find(u => u.id === userId);
      
      await this.registerMovement(
        userId,
        reviewer?.username || "GESTOR",
        adj.itemId,
        adj.adjustmentType,
        adj.deltaQuantity,
        `AJUSTE APROVADO: ${adj.reason}`
      );
    }

    adj.status = status;
    adj.reviewedBy = userId;
    adj.reviewedAt = Date.now();
    this.set(STORAGE_KEYS.ADJUSTMENTS, adjustments);
  }
}

export const db = new Database();
