
import React, { useState } from 'react';
import { createWorkScheduleTask, getStoredAssets } from '../services/storage';
import { playVoiceAlert } from '../services/gemini';

interface WorkScheduleFormProps {
  onClose: () => void;
}

const WorkScheduleForm: React.FC<WorkScheduleFormProps> = ({ onClose }) => {
  const assets = getStoredAssets();
  const [formData, setFormData] = useState({
    assetId: '',
    assetName: '',
    location: '',
    startDate: new Date().toISOString().split('T')[0],
    intervalMonths: 3,
    technician: '',
    status: 'Planejado' as any
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalAssetName = formData.assetName;
    let finalLocation = formData.location;

    if (formData.assetId) {
      const asset = assets.find(a => a.id === formData.assetId);
      if (asset) {
        finalAssetName = asset.name;
        finalLocation = asset.location;
      }
    }

    createWorkScheduleTask({
      assetId: formData.assetId || undefined,
      assetName: finalAssetName,
      location: finalLocation,
      startDate: formData.startDate,
      intervalMonths: formData.intervalMonths,
      technician: formData.technician,
      status: formData.status
    });

    const msg = `Cronograma de manutenção preventiva criado para ${finalAssetName}. Intervalo de ${formData.intervalMonths} meses.`;
    playVoiceAlert(msg);
    onClose();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Planejar Ficha de Trabalho</h2>
          <p className="text-slate-400 text-xs">Agende manutenções preventivas recorrentes.</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">✕</button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Equipamento / Objeto</span>
            <select 
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-blue-500/10"
              value={formData.assetId}
              onChange={e => setFormData({...formData, assetId: e.target.value})}
            >
              <option value="">Entrada Manual / Outros</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.location})</option>)}
            </select>
          </label>

          {!formData.assetId && (
            <>
              <label className="block">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Nome do Equipamento</span>
                <input 
                  required
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                  value={formData.assetName}
                  onChange={e => setFormData({...formData, assetName: e.target.value})}
                />
              </label>
              <label className="block">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Local</span>
                <input 
                  required
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                />
              </label>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Data Inicial</span>
              <input 
                type="date"
                required
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
              />
            </label>
            <label className="block">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Intervalo (Meses)</span>
              <input 
                type="number"
                min="1"
                required
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                value={formData.intervalMonths}
                onChange={e => setFormData({...formData, intervalMonths: parseInt(e.target.value)})}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Técnico Responsável</span>
            <input 
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
              placeholder="Ex: João da Manutenção"
              value={formData.technician}
              onChange={e => setFormData({...formData, technician: e.target.value})}
            />
          </label>
        </div>

        <button 
          type="submit"
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          Gerar Cronograma Anual
        </button>
      </form>
    </div>
  );
};

export default WorkScheduleForm;
