
import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { OSStatus, OS, EventType, Asset } from '../types';
import { createOrder, logEvent, getStoredAssets } from '../services/storage';
import { playVoiceAlert } from '../services/gemini';

interface OSQuickFormProps {
  onClose: () => void;
}

const OSQuickForm: React.FC<OSQuickFormProps> = ({ onClose }) => {
  const assets = getStoredAssets();
  const [showScanner, setShowScanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [formData, setFormData] = useState({
    assetId: '',
    location: '',
    serviceType: '',
    requesterName: '',
    technician: '',
    priority: 'Média' as OS['priority'],
    description: '',
    equipmentReplacement: '',
    partsUsed: '',
    materialNeeds: '',
    isWaitingPurchase: false,
    deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });

  // Lógica do Scanner QR interno ao formulário
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationId: number;

    if (showScanner) {
      const startCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            requestAnimationFrame(tick);
          }
        } catch (err) {
          console.error("Erro ao acessar câmera:", err);
          setShowScanner(false);
          alert("Não foi possível acessar a câmera para o QR Code.");
        }
      };

      const tick = () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.height = videoRef.current.videoHeight;
            canvas.width = videoRef.current.videoWidth;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
              const foundAsset = assets.find(a => a.id === code.data || code.data.includes(a.id));
              if (foundAsset) {
                setFormData(prev => ({
                  ...prev,
                  assetId: foundAsset.id,
                  location: foundAsset.location
                }));
                setShowScanner(false);
                playVoiceAlert(`Equipamento ${foundAsset.name} identificado com sucesso.`);
                return;
              }
            }
          }
        }
        if (showScanner) animationId = requestAnimationFrame(tick);
      };

      startCamera();
    }

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animationId);
    };
  }, [showScanner, assets]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const asset = assets.find(a => a.id === formData.assetId);
    
    const newOS = createOrder({
      assetId: formData.assetId || undefined,
      assetName: asset?.name || 'Serviço Geral / Infraestrutura',
      location: formData.location,
      serviceType: formData.serviceType,
      requesterName: formData.requesterName,
      technician: formData.technician,
      priority: formData.priority,
      description: formData.description,
      equipmentReplacement: formData.equipmentReplacement,
      partsUsed: formData.partsUsed,
      materialNeeds: formData.materialNeeds,
      isWaitingPurchase: formData.isWaitingPurchase,
      deadline: formData.deadline,
      status: OSStatus.OPEN
    });

    const msg = `Ordem de serviço ${newOS.id} registrada. Setor: ${formData.location}. Solicitante: ${formData.requesterName}.`;
    playVoiceAlert(msg);
    logEvent(EventType.OS, msg, formData.priority === 'Crítica' ? 'critical' : 'warning');
    onClose();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="p-1.5 bg-blue-600 rounded-lg text-xs">🛠️</span>
            Nova Ordem de Serviço
          </h2>
          <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mt-1">Hospitalar • Sincronismo Ativo</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">✕</button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50 custom-scrollbar">
        {/* Bloco de Scanner QR Opcional */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vincular Equipamento</h3>
            {showScanner && <span className="text-[9px] font-bold text-red-500 animate-pulse">CÂMERA ATIVA</span>}
          </div>
          
          {!showScanner ? (
            <button 
              type="button"
              onClick={() => setShowScanner(true)}
              className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">📷</span>
              <div className="text-left">
                <p className="text-sm font-black text-slate-800 uppercase tracking-tighter">Escanear QR do Ativo</p>
                <p className="text-[10px] text-slate-400 font-medium">Identificação instantânea via câmera</p>
              </div>
            </button>
          ) : (
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-inner border-4 border-white">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 pointer-events-none border-2 border-blue-500/50 m-8 rounded-xl">
                 <div className="absolute inset-0 scanner-laser opacity-40"></div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowScanner(false)}
                className="absolute bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase"
              >
                Cancelar
              </button>
            </div>
          )}

          <div className="relative">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Ou selecione manualmente</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              value={formData.assetId}
              onChange={e => {
                const a = assets.find(x => x.id === e.target.value);
                setFormData({...formData, assetId: e.target.value, location: a?.location || formData.location});
              }}
            >
              <option value="">Serviço de Infraestrutura Geral</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
            </select>
          </div>
        </div>

        {/* Dados da OS */}
        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Local / Setor *</label>
                <input required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridade *</label>
                <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none font-bold" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}>
                  <option value="Baixa">🟢 Baixa</option>
                  <option value="Média">🟡 Média</option>
                  <option value="Alta">🟠 Alta</option>
                  <option value="Crítica">🔴 Crítica</option>
                </select>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solicitante *</label>
                <input required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" value={formData.requesterName} onChange={e => setFormData({...formData, requesterName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Serviço *</label>
                <select required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})}>
                  <option value="">Selecione...</option>
                  <option value="Corretiva">Corretiva</option>
                  <option value="Preventiva">Preventiva</option>
                  <option value="Instalação">Instalação</option>
                </select>
              </div>
           </div>

           <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição da Ocorrência *</label>
             <textarea required rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
           </div>

           <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 space-y-4">
              <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Materiais e Peças</h4>
              <div className="grid grid-cols-2 gap-4">
                 <input className="bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs" placeholder="Necessidade de Compra" value={formData.materialNeeds} onChange={e => setFormData({...formData, materialNeeds: e.target.value})} />
                 <input className="bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs" placeholder="Peças Utilizadas" value={formData.partsUsed} onChange={e => setFormData({...formData, partsUsed: e.target.value})} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" className="w-4 h-4 rounded text-amber-600" checked={formData.isWaitingPurchase} onChange={e => setFormData({...formData, isWaitingPurchase: e.target.checked})} />
                 <span className="text-xs font-bold text-amber-700">Aguardando Aprovação de Compra</span>
              </label>
           </div>
        </div>

        <button 
          type="submit"
          className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <span>💾</span> Salvar Ordem de Serviço
        </button>
      </form>
    </div>
  );
};

export default OSQuickForm;
