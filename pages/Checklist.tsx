
import React, { useState, useEffect } from 'react';
import { ChecklistStatus, ChecklistItem, EventType } from '../types';
import { playVoiceAlert } from '../services/gemini';
import { getStoredChecklist, saveChecklistItem, logEvent } from '../services/storage';

const Checklist: React.FC = () => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [saveIndicator, setSaveIndicator] = useState<string | null>(null);

  useEffect(() => {
    setItems(getStoredChecklist());
  }, []);

  const updateStatus = (id: string, status: ChecklistStatus) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, status };
        saveChecklistItem(updated);
        
        if (status === ChecklistStatus.FAIL) {
          const alertMsg = `HospGuardian alerta: falha detectada em ${item.label}. Abrindo ordem de serviço prioritária.`;
          playVoiceAlert(alertMsg);
          logEvent(EventType.ALERT, alertMsg, 'critical');
        }
        
        return updated;
      }
      return item;
    }));
  };

  const updateDate = (id: string, date: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, lastChecked: date };
        saveChecklistItem(updated);
        
        // Ativar indicador visual de persistência
        setSaveIndicator(`date-${id}`);
        setTimeout(() => setSaveIndicator(null), 1500);
        
        return updated;
      }
      return item;
    }));
  };

  const handleNoteSave = (id: string, note: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, observations: note };
        saveChecklistItem(updated);
        setSaveIndicator(`note-${id}`);
        setTimeout(() => setSaveIndicator(null), 1500);
        return updated;
      }
      return item;
    }));
  };

  const categories = Array.from(new Set(items.map(i => i.category)));

  return (
    <div className="p-8">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">Checklist Crítico Diário</h1>
          <p className="text-slate-500">Cada atualização aqui alimenta automaticamente o Dashboard de Atividade.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              playVoiceAlert("Sincronização de notas e status concluída.");
              logEvent(EventType.SYSTEM, "Sincronização manual efetuada.");
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            Sincronizar Agora
          </button>
        </div>
      </header>

      <div className="space-y-8">
        {categories.map(cat => (
          <section key={cat}>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">{cat}</h3>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Equipamento / Sistema</th>
                    <th className="px-6 py-4">Última Verificação</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.filter(i => i.category === cat).map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-700 text-sm">{item.label}</p>
                      </td>
                      <td className="px-6 py-4 relative">
                        <div className="flex items-center gap-2">
                          <input 
                            type="date"
                            value={item.lastChecked}
                            onChange={(e) => updateDate(item.id, e.target.value)}
                            className="bg-white border border-slate-200 text-slate-600 text-[11px] font-bold rounded-lg p-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                          />
                          {saveIndicator === `date-${item.id}` && (
                            <span className="absolute -right-4 text-[9px] font-black text-green-500 animate-pulse">✓ SALVO</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-1.5">
                          <button 
                            onClick={() => updateStatus(item.id, ChecklistStatus.OK)}
                            className={`p-2 rounded-lg transition-all ${item.status === ChecklistStatus.OK ? 'bg-green-100 text-green-600 scale-110 shadow-sm border border-green-200' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}
                          >
                            ✅
                          </button>
                          <button 
                             onClick={() => updateStatus(item.id, ChecklistStatus.PENDING)}
                             className={`p-2 rounded-lg transition-all ${item.status === ChecklistStatus.PENDING ? 'bg-amber-100 text-amber-600 scale-110 shadow-sm border border-amber-200' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}
                          >
                            ⚠️
                          </button>
                          <button 
                             onClick={() => updateStatus(item.id, ChecklistStatus.FAIL)}
                             className={`p-2 rounded-lg transition-all ${item.status === ChecklistStatus.FAIL ? 'bg-red-100 text-red-600 scale-110 shadow-sm border border-red-200' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}
                          >
                            ❌
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 relative">
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            placeholder="Nota técnica..." 
                            defaultValue={item.observations}
                            onBlur={(e) => handleNoteSave(item.id, e.target.value)}
                            className="w-full bg-transparent border-b border-transparent focus:border-blue-300 px-1 py-1 text-xs focus:ring-0 text-slate-600 placeholder:text-slate-300 transition-all italic"
                          />
                          {saveIndicator === `note-${item.id}` && (
                            <span className="absolute right-2 text-[9px] font-black text-green-500">SALVO</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default Checklist;
