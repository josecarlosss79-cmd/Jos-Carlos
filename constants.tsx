
import { AssetStatus, OSStatus, ChecklistStatus } from './types';

export const CHECKLIST_CATEGORIES = [
  'Infraestrutura Crítica',
  'Climatização',
  'Gases Medicinais',
  'Energia',
  'Segurança',
  'Cardiologia',
  'Ultrassonografia',
  'Ressonância/Tomografia',
  'Centro Cirúrgico',
  'Laboratório',
  'Enfermaria'
];

// Versão de Produção: Iniciamos sem itens pré-definidos. 
// O gestor deve cadastrar ativos que alimentarão o checklist.
export const INITIAL_CHECKLIST_ITEMS = [];

export const MOCK_ASSETS = [];

export const MOCK_ORDERS = [];
