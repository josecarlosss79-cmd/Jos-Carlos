
import { ChecklistItem, Asset, OS, AssetStatus, SystemEvent, EventType, ChecklistStatus, OSStatus, WorkScheduleTask, StockItem, TelemetryData, UserRole } from '../types';

const CHECKLIST_KEY = 'hospguardian_checklist_data';
const ASSETS_KEY = 'hospguardian_assets_data';
const ORDERS_KEY = 'hospguardian_orders_data';
const EVENTS_KEY = 'hospguardian_events_log';
const SCHEDULE_KEY = 'hospguardian_work_schedule';
const STOCK_KEY = 'hospguardian_stock_data';
const TELEMETRY_KEY = 'hospguardian_telemetry_data';
const USER_ROLE_KEY = 'hospguardian_user_role';
const SYNC_QUEUE_KEY = 'hospguardian_sync_queue';

const syncChannel = new BroadcastChannel('hospguardian_realtime_sync');

// Retorna quantos itens estão esperando internet para subir
export const getSyncQueueCount = (): number => {
  const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  return queue.length;
};

const pushToCloud = async (type: string, data: any) => {
  if (!navigator.onLine) {
    const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    queue.push({ type, data, timestamp: Date.now() });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    return false;
  }
  // Em cenário real, aqui seria o fetch('/api/sync')
  return true;
};

// Tenta limpar a fila quando volta a internet
window.addEventListener('online', async () => {
  const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  if (queue.length > 0) {
    // console.log(`[CLOUD] Sincronizando ${queue.length} itens pendentes...`);
    localStorage.setItem(SYNC_QUEUE_KEY, '[]');
    notifySync('QUEUE_CLEARED');
  }
});

const notifySync = (type: string, data?: any) => {
  syncChannel.postMessage({ type, timestamp: Date.now(), data });
  pushToCloud(type, data);
};

export const subscribeToSync = (callback: (data: any) => void) => {
  syncChannel.onmessage = (event) => callback(event.data);
};

const sanitize = (str: string): string => {
  if (!str) return '';
  return str.replace(/[<>]/g, '').trim();
};

export const isOnline = () => navigator.onLine;

const getLocalDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
};

export const getUserRole = (): UserRole => {
  const stored = localStorage.getItem(USER_ROLE_KEY);
  return (stored as UserRole) || UserRole.TECHNICIAN;
};

export const setUserRole = (role: UserRole) => {
  localStorage.setItem(USER_ROLE_KEY, role);
  notifySync('ROLE_CHANGED');
};

export const logEvent = (type: EventType, message: string, severity: 'info' | 'warning' | 'critical' | 'security' = 'info') => {
  const events = getStoredEvents();
  const newEvent: SystemEvent = {
    id: `EV-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type,
    user: getUserRole(),
    message: sanitize(message),
    severity
  };
  events.unshift(newEvent);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(0, 500)));
  notifySync('EVENT_LOGGED', newEvent);
  return newEvent;
};

export const getStoredEvents = (): SystemEvent[] => {
  const stored = localStorage.getItem(EVENTS_KEY);
  if (!stored) {
    return [{
      id: `EV-INIT`,
      timestamp: new Date().toISOString(),
      type: EventType.SYSTEM,
      user: 'HospGuardian Core',
      message: 'Sistema de Gestão Hospitalar Ativado.',
      severity: 'security'
    }];
  }
  return JSON.parse(stored);
};

export const getStoredTelemetry = (): TelemetryData[] => {
  const stored = localStorage.getItem(TELEMETRY_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const updateTelemetry = (data: TelemetryData) => {
  const list = getStoredTelemetry();
  const index = list.findIndex(t => t.id === data.id);
  if (index !== -1) {
    list[index] = data;
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(list));
  } else {
    list.push(data);
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(list));
  }
  notifySync('TELEMETRY_UPDATED', data);
};

export const getStoredChecklist = (): ChecklistItem[] => {
  const stored = localStorage.getItem(CHECKLIST_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveChecklistItem = (updatedItem: ChecklistItem) => {
  const items = getStoredChecklist();
  const index = items.findIndex(i => i.id === updatedItem.id);
  updatedItem.observations = sanitize(updatedItem.observations);
  if (index !== -1) {
    items[index] = updatedItem;
  } else {
    items.push(updatedItem);
  }
  localStorage.setItem(CHECKLIST_KEY, JSON.stringify(items));
  notifySync('CHECKLIST_UPDATED', updatedItem);
};

export const getStoredAssets = (): Asset[] => {
  const stored = localStorage.getItem(ASSETS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveAsset = (updatedAsset: Asset) => {
  const assets = getStoredAssets();
  const index = assets.findIndex(a => a.id === updatedAsset.id);
  if (index !== -1) {
    assets[index] = updatedAsset;
    localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
    notifySync('ASSETS_UPDATED', updatedAsset);
  }
};

export const updateAssetStatus = (id: string, status: AssetStatus) => {
  const assets = getStoredAssets();
  const index = assets.findIndex(a => a.id === id);
  if (index !== -1) {
    assets[index].status = status;
    localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
    notifySync('ASSETS_UPDATED', assets[index]);
  }
};

export const addAsset = (newAsset: Omit<Asset, 'id'>) => {
  const assets = getStoredAssets();
  const id = `AST-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const sanitizedAsset: Asset = { ...newAsset, id };
  assets.unshift(sanitizedAsset);
  localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
  
  const checklistItem: ChecklistItem = {
    id: `CHK-${id}`,
    label: newAsset.name,
    category: newAsset.category,
    status: ChecklistStatus.OK,
    observations: '',
    lastChecked: getLocalDate()
  };
  saveChecklistItem(checklistItem);

  notifySync('ASSET_ADDED', sanitizedAsset);
  return sanitizedAsset;
};

export const createOrder = (order: Partial<OS>) => {
  const orders = getStoredOrders();
  const newOrder = {
    id: `OS-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
    ...order,
    status: order.status || OSStatus.OPEN
  } as OS;
  orders.unshift(newOrder);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  notifySync('ORDER_CREATED', newOrder);
  return newOrder;
};

export const updateOrder = (id: string, updates: Partial<OS>) => {
  const orders = getStoredOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index !== -1) {
    orders[index] = { ...orders[index], ...updates };
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    notifySync('ORDER_UPDATED', orders[index]);
    return orders[index];
  }
  return null;
};

export const getStoredOrders = (): OS[] => {
  const stored = localStorage.getItem(ORDERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const getAssetMaintenanceHistory = (assetId: string): OS[] => {
  const orders = getStoredOrders();
  return orders.filter(o => o.assetId === assetId && o.status === OSStatus.COMPLETED);
};

export const getStoredWorkSchedule = (): WorkScheduleTask[] => {
  const stored = localStorage.getItem(SCHEDULE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const createWorkScheduleTask = (task: Partial<WorkScheduleTask>) => {
  const schedule = getStoredWorkSchedule();
  const id = `SCH-${Date.now()}`;
  const occurrences: string[] = [];
  if (task.startDate && task.intervalMonths) {
    let current = new Date(task.startDate);
    for(let i=0; i<4; i++) {
       occurrences.push(current.toISOString().split('T')[0]);
       current.setMonth(current.getMonth() + task.intervalMonths);
    }
  }
  const newTask: WorkScheduleTask = {
    id,
    assetId: task.assetId,
    assetName: task.assetName || '',
    location: task.location || '',
    startDate: task.startDate || getLocalDate(),
    intervalMonths: task.intervalMonths || 3,
    occurrences,
    technician: task.technician,
    status: task.status || 'Planejado',
    createdAt: new Date().toISOString()
  };
  schedule.unshift(newTask);
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
  notifySync('SCHEDULE_UPDATED', newTask);
  return newTask;
};

export const getStoredStock = (): StockItem[] => {
  const stored = localStorage.getItem(STOCK_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveStockItem = (updatedItem: StockItem) => {
  const stock = getStoredStock();
  const index = stock.findIndex(i => i.id === updatedItem.id);
  if (index !== -1) {
    stock[index] = updatedItem;
    localStorage.setItem(STOCK_KEY, JSON.stringify(stock));
    notifySync('STOCK_UPDATED', updatedItem);
  }
};

export const addStockItem = (newItemData: Omit<StockItem, 'id'>) => {
  const stock = getStoredStock();
  const id = `STK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const newItem: StockItem = { ...newItemData, id };
  stock.push(newItem);
  localStorage.setItem(STOCK_KEY, JSON.stringify(stock));
  notifySync('STOCK_ADDED', newItem);
  return newItem;
};

export const getSystemStats = () => {
  const assets = getStoredAssets();
  const orders = getStoredOrders();
  return {
    verifiedToday: getStoredChecklist().filter(i => i.lastChecked === getLocalDate()).length,
    totalChecklist: getStoredChecklist().length,
    criticalAssets: assets.filter(a => a.status === AssetStatus.CRITICAL).length,
    openOrders: orders.filter(o => o.status !== OSStatus.COMPLETED).length,
    totalEvents: getStoredEvents().length,
    isCloudSynced: isOnline(),
    securityAlerts: getStoredEvents().filter(e => e.severity === 'security').length,
    recentActivity: getStoredEvents().slice(0, 10),
    operationalAssets: assets.filter(a => a.status === AssetStatus.OPERATIONAL).length,
    maintenanceAssets: assets.filter(a => a.status === AssetStatus.MAINTENANCE).length,
    criticalTelemetry: getStoredTelemetry().filter(t => t.value < t.min || t.value > t.max).length
  };
};

export const wipeAllData = () => {
  localStorage.clear();
  window.location.reload();
};
