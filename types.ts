
export enum AssetStatus {
  OPERATIONAL = 'Operacional',
  MAINTENANCE = 'Em Manutenção',
  CRITICAL = 'Crítico',
  RETIRED = 'Desativado'
}

export enum OSStatus {
  OPEN = 'Aberta',
  IN_PROGRESS = 'Em Amdamento',
  COMPLETED = 'Concluída',
  CANCELLED = 'Cancelada'
}

export enum ChecklistStatus {
  OK = 'OK',
  PENDING = 'Pendente',
  FAIL = 'Falha'
}

export enum UserRole {
  ADMIN = 'Administrador',
  MANAGER = 'Gestor',
  TECHNICIAN = 'Técnico'
}

export enum EventType {
  CHECKLIST = 'Checklist',
  OS = 'Ordem de Serviço',
  ALERT = 'Alerta de Voz',
  ASSET = 'Ativo',
  SYSTEM = 'Sistema',
  SCHEDULE = 'Cronograma',
  SECURITY = 'Segurança',
  STOCK = 'Estoque',
  TELEMETRY = 'Telemetria',
  CALIBRATION = 'Calibração'
}

export interface TelemetryData {
  id: string;
  assetId: string;
  type: 'Pressão' | 'Temperatura' | 'Vibração' | 'Consumo';
  value: number;
  unit: string;
  min: number;
  max: number;
  lastUpdate: string;
}

export interface CalibrationRecord {
  id: string;
  date: string;
  certificateNumber: string;
  validUntil: string;
  company: string;
  status: 'Válido' | 'Vencido' | 'Urgente';
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  lastRestock: string;
  location: string;
}

export interface WorkScheduleTask {
  id: string;
  assetId?: string;
  assetName: string;
  location: string;
  startDate: string;
  intervalMonths: number;
  occurrences: string[];
  technician?: string;
  status: 'Planejado' | 'Realizado' | 'Atrasado';
  createdAt: string;
}

export interface SystemEvent {
  id: string;
  timestamp: string;
  type: EventType;
  user: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'security';
}

export interface Asset {
  id: string;
  name: string;
  category: 'Médico' | 'Infraestrutura' | 'Segurança' | 'Conforto';
  location: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  warrantyUntil: string;
  lastMaintenance: string;
  nextMaintenance: string;
  status: AssetStatus;
  isCalibratable?: boolean;
  calibration?: CalibrationRecord;
  telemetryEnabled?: boolean;
}

export interface OS {
  id: string;
  assetId?: string;
  assetName: string;
  location: string; 
  serviceType: string;
  equipmentReplacement?: string;
  partsUsed?: string;
  requesterName: string;
  technician?: string;
  status: OSStatus;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  materialNeeds?: string;
  isWaitingPurchase: boolean;
  deadline: string;
  description: string;
  createdAt: string;
  completedAt?: string;
  cost?: number;
  evidencePhoto?: string;
  digitalSignature?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  category: string;
  status: ChecklistStatus;
  observations: string;
  lastChecked: string;
}
