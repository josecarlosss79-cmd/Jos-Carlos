
import React, { useState, useEffect, useRef } from 'react';
import { getStoredOrders, updateOrder, logEvent } from '../services/storage';
import { OS, OSStatus, EventType } from '../types';

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<OS[]>([]);
  const [filter, setFilter] = useState('');
  const [showQRModal, setShowQRModal] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeOSForUpload, setActiveOSForUpload] = useState<string | null>(null);

  useEffect(() => {
    setOrders(getStoredOrders());
    const interval = setInterval(() => setOrders(getStoredOrders()), 5000);
    return () => clearInterval(interval);
  }, []);

  const getPriorityColor = (p: OS['priority']) => {
    switch (p) {
      case 'Crítica': return 'bg-red-500 text-white';
      case 'Alta': return 'bg-orange-500 text-white';
      case 'Média': return 'bg-amber-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeOSForUpload) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      updateOrder(activeOSForUpload, { evidencePhoto: base64String });
      logEvent(EventType.OS, `Evidência fotográfica anexada à OS ${activeOSForUpload}`, 'info');
      setOrders(getStoredOrders());
      setActiveOSForUpload(null);
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = (osId: string) => {
    setActiveOSForUpload(osId);
    fileInputRef.current?.click();
  };

  const filteredOrders = orders.filter(o => 
    o.assetName.toLowerCase().includes(filter.toLowerCase()) ||
    o.id.toLowerCase().includes(filter.toLowerCase()) ||
    o.location.toLowerCase().includes(filter.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="p-8 animate-in fade-in duration-500 min-h-screen">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        capture="environment"
        onChange={handleFileUpload}
      />

      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fluxo de Ordens de Serviço</h1>
        <p className="text-slate-500 font-medium">Controle tático de manutenções e rastreabilidade via QR Code.</p>
      </header>

      {/* KPI Mini Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        {[
          { label: 'Abertas', val: orders.filter(o => o.status === OSStatus.OPEN).length, color: 'text-blue-600' },
          { label: 'Em Processo', val: orders.filter(o => o.status === OSStatus.IN_PROGRESS).length, color: 'text-amber-600' },
          { label: 'Aguard. Compra', val: orders.filter(o => o.isWaitingPurchase).length, color: 'text-red-500' },
          { label: 'Concluídas', val: orders.filter(o => o.status === OSStatus.COMPLETED).length, color: 'text-green-600' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
            <p className={`text-2xl font-black ${item.color}`}>{item.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100">
           <div className="relative max-w-md">
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
             <input 
              type="text" 
              placeholder="Pesquisar OS, Ativo ou Local..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              value={filter}
              onChange={e => setFilter(e.target.value)}
             />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/30 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Código / QR</th>
                <th className="px-8 py-5">Ativo / Setor</th>
                <th className="px-8 py-5">Prioridade / Status</th>
                <th className="px-8 py-5">Evidência</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic">Nenhuma OS encontrada.</td>
                </tr>
              ) : (
                filteredOrders.map(os => (
                  <tr key={os.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setShowQRModal(os.id)}
                          className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center text-lg hover:scale-110 transition-transform shadow-lg"
                          title="Ver QR Code da OS"
                        >
                          📱
                        </button>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-blue-600 tracking-tighter">{os.id}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {os.assetId || 'INFRA'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{os.assetName}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-black">{os.location}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getPriorityColor(os.priority)}`}>
                          {os.priority}
                        </span>
                        <span className={`text-[10px] font-black uppercase ${os.status === OSStatus.COMPLETED ? 'text-green-600' : 'text-amber-600'}`}>
                          {os.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {os.evidencePhoto ? (
                        <button 
                          onClick={() => setSelectedImage(os.evidencePhoto!)}
                          className="w-12 h-12 rounded-xl overflow-hidden border-2 border-blue-100 hover:border-blue-500 transition-all shadow-sm"
                        >
                          <img src={os.evidencePhoto} alt="Evidência" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => triggerUpload(os.id)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-200"
                        >
                          📷 Anexar
                        </button>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => triggerUpload(os.id)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Anexar Evidência"
                        >
                          📷
                        </button>
                        {os.isWaitingPurchase && (
                          <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-[9px] font-black uppercase animate-pulse">Compra Pendente</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de QR Code da OS */}
      {showQRModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in" onClick={() => setShowQRModal(null)}>
          <div className="bg-white p-12 rounded-[3rem] text-center shadow-2xl animate-in zoom-in duration-300 relative" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Identificador QR</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Ordem de Serviço: {showQRModal}</p>
            
            <div className="w-64 h-64 bg-slate-100 rounded-[2rem] mx-auto flex items-center justify-center border-4 border-slate-50 shadow-inner overflow-hidden relative group">
              <div className="grid grid-cols-4 gap-1 p-4 opacity-80 group-hover:opacity-100 transition-opacity">
                 {[...Array(16)].map((_, i) => (
                   <div key={i} className={`w-8 h-8 rounded-sm ${Math.random() > 0.5 ? 'bg-slate-900' : 'bg-transparent'}`} />
                 ))}
              </div>
              <div className="absolute inset-0 border-2 border-slate-900 m-4 rounded-xl"></div>
            </div>

            <button 
              onClick={() => setShowQRModal(null)}
              className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}

      {/* Visualizador de Imagem */}
      {selectedImage && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <img src={selectedImage} alt="Evidência Expandida" className="w-full rounded-[2rem] shadow-2xl border-4 border-white/10" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-6 -right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-xl hover:scale-110 transition-transform"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
