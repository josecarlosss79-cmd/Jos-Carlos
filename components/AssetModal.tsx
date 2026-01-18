
import React, { useState, useEffect } from 'react';
import { Asset, AssetStatus, OSStatus, EventType, OS } from '../types';
import { playVoiceAlert } from '../services/gemini';
import { updateAssetStatus, createOrder, logEvent, getAssetMaintenanceHistory } from '../services/storage';

interface AssetModalProps {
  asset: Asset;
  onClose: () => void;
  onAction: (assetId: string, action: string) => void;
}

const AssetModal: React.FC<AssetModalProps> = ({ asset, onClose, onAction }) => {
  const [loading, setLoading] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const [history, setHistory] = useState<OS[]>([]);

  useEffect(() => {
    // Carrega o histórico de manutenções do ativo ao abrir o modal
    const historyData = getAssetMaintenanceHistory(asset.id);
    setHistory(historyData);
  }, [asset.id]);

  const handleAction = async (action: string) => {
    setLoading(true);
    // Simulação de latência de rede para feedback de sincronização
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let message = "";
    let newStatus = asset.status;

    if (action === 'verify') {
      message = `Verificação concluída para ${asset.name}. Ativo sincronizado como Operacional.`;
      newStatus = AssetStatus.OPERATIONAL;
      updateAssetStatus(asset.id, newStatus);
      logEvent(EventType.CHECKLIST, `Inspeção positiva via scanner para ${asset.name}`, 'info');
    } 
    else if (action === 'maintenance') {
      message = `Ativo ${asset.name} marcado em manutenção no inventário.`;
      newStatus = AssetStatus.MAINTENANCE;
      updateAssetStatus(asset.id, newStatus);
      logEvent(EventType.ASSET, `Status de manutenção definido via comando rápido para ${asset.name}`, 'warning');
    } 
    else if (action === 'urgent_os') {
      message = `ALERTA: OS de Urgência aberta para ${asset.name}. Status crítico sincronizado.`;
      newStatus = AssetStatus.CRITICAL;
      updateAssetStatus(asset.id, newStatus);
      createOrder({
        assetId: asset.id,
        assetName: asset.name,
        location: asset.location,
        description: "OS DE URGÊNCIA: Falha crítica reportada via Scanner QR.",
        priority: "Crítica",
        status: OSStatus.OPEN
      });
      logEvent(EventType.OS, `OS CRÍTICA via scanner para ${asset.name}`, 'critical');
    }
    else if (action === 'retire') {
      message = `Comando de desativação executado para ${asset.name}.`;
      newStatus = AssetStatus.RETIRED;
      updateAssetStatus(asset.id, newStatus);
      logEvent(EventType.ASSET, `Remoção do fluxo: ${asset.name}`, 'critical');
    }
    
    setSyncComplete(true);
    playVoiceAlert(message);
    logEvent(EventType.ALERT, message, action === 'urgent_os' ? 'critical' : 'info');
    
    setTimeout(() => {
      onAction(asset.id, action);
      setLoading(false);
      // O modal agora oferece a opção de fechar manualmente para permitir leitura de histórico
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in duration-500 border border-white/20 max-h-[90vh] flex flex-col">
        
        {/* Header Superior */}
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-6xl">🛡️</div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-blue-500/30 border border-blue-400/30">
                {asset.category === 'Médico' ? '💉' : asset.category === 'Infraestrutura' ? '⚡' : '🛡️'}
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter leading-none">{asset.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-blue-400 text-[10px] font-mono uppercase tracking-[0.2em]">{asset.id}</p>
                  <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                  <p className="text-slate-400 text-[10px] font-bold uppercase">{asset.location}</p>
                </div>
              </div>
            </div>
          </div>
          <button 
            disabled={loading}
            onClick={onClose} 
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Card de Status Sincronizado */}
          <div className="flex items-center justify-between bg-slate-50 p-5 rounded-3xl border border-slate-100">
            <div className="flex items-center gap-3">
               <div className={`w-3 h-3 rounded-full animate-pulse ${
                 asset.status === AssetStatus.OPERATIONAL ? 'bg-green-500' : 
                 asset.status === AssetStatus.MAINTENANCE ? 'bg-amber-500' : 'bg-red-500'
               }`}></div>
               <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Estado Atual</p>
            </div>
            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${
              asset.status === AssetStatus.OPERATIONAL ? 'bg-green-100 text-green-700 border-green-200' : 
              asset.status === AssetStatus.MAINTENANCE ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200'
            }`}>
              {asset.status}
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1 h-3 bg-blue-600 rounded-full"></span>
              Ações Rápidas de Campo
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button 
                disabled={loading}
                onClick={() => handleAction('verify')}
                className="w-full flex items-center justify-between p-4 rounded-2xl border-2 bg-white border-slate-100 hover:border-green-500 hover:bg-green-50 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl group-hover:scale-110 transition-transform">✅</span>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">Operação OK</p>
                  </div>
                </div>
                {loading && <div className="animate-spin rounded-full h-3 w-3 border-2 border-green-500 border-t-transparent"></div>}
              </button>

              <button 
                disabled={loading}
                onClick={() => handleAction('maintenance')}
                className="w-full flex items-center justify-between p-4 rounded-2xl border-2 bg-white border-slate-100 hover:border-amber-500 hover:bg-amber-50 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl group-hover:rotate-12 transition-transform">🛠️</span>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">Manutenção</p>
                  </div>
                </div>
                {loading && <div className="animate-spin rounded-full h-3 w-3 border-2 border-amber-500 border-t-transparent"></div>}
              </button>
            </div>

            <button 
              disabled={loading}
              onClick={() => handleAction('urgent_os')}
              className="w-full flex items-center justify-between p-5 rounded-2xl border-2 bg-red-600 border-red-500 hover:bg-red-700 transition-all group shadow-lg shadow-red-200 active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl group-hover:animate-pulse transition-transform">🚨</span>
                <div className="text-left">
                  <p className="text-xs font-black text-white uppercase tracking-tighter">Gerar OS de Urgência</p>
                  <p className="text-[9px] text-red-100 font-medium opacity-80">Abre chamado crítico imediatamente</p>
                </div>
              </div>
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
            </button>
          </div>

          {/* NOVA SEÇÃO: HISTÓRICO DE MANUTENÇÃO */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1 h-3 bg-slate-900 rounded-full"></span>
              Histórico de Manutenção Sincronizado
            </h3>

            {history.length === 0 ? (
              <div className="py-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <span className="text-2xl mb-2">📁</span>
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhum registro anterior</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">
                        {h.serviceType || 'Geral'}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {new Date(h.completedAt || h.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 line-clamp-2 mb-2">{h.description}</p>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-1.5">
                         <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px]">👤</div>
                         <span className="text-[10px] font-bold text-slate-500">{h.technician || 'Não informado'}</span>
                       </div>
                       <span className="text-[9px] font-black text-green-600 uppercase">Concluído</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {syncComplete && (
            <div className="bg-green-600 p-4 rounded-2xl animate-in fade-in slide-in-from-bottom-2 flex items-center justify-center gap-3 shadow-xl shadow-green-200">
              <span className="text-white text-xl font-bold">✓</span>
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Sincronizado com Sucesso</p>
            </div>
          )}
        </div>

        {/* Footer do Modal com botão Continuar Varredura */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <span>📷</span> Continuar Varredura
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetModal;
