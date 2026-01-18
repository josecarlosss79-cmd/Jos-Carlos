
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssetStatus, Asset, EventType } from '../types';
import { getStoredAssets, saveAsset, logEvent, addAsset } from '../services/storage';
import { playVoiceAlert } from '../services/gemini';
import { CHECKLIST_CATEGORIES } from '../constants';

const Assets: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const navigate = useNavigate();

  // Estado para o novo ativo
  const [newAsset, setNewAsset] = useState<Omit<Asset, 'id'>>({
    name: '',
    category: 'Médico',
    location: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    warrantyUntil: new Date().toISOString().split('T')[0],
    lastMaintenance: new Date().toISOString().split('T')[0],
    nextMaintenance: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: AssetStatus.OPERATIONAL
  });

  useEffect(() => {
    setAssets(getStoredAssets());
  }, []);

  const getStatusColor = (status: AssetStatus) => {
    switch (status) {
      case AssetStatus.OPERATIONAL: return 'bg-green-100 text-green-700 border-green-200';
      case AssetStatus.CRITICAL: return 'bg-red-100 text-red-700 border-red-200';
      case AssetStatus.MAINTENANCE: return 'bg-amber-100 text-amber-700 border-amber-200';
      case AssetStatus.RETIRED: return 'bg-slate-100 text-slate-500 border-slate-200';
      default: return 'bg-slate-50 text-slate-700';
    }
  };

  /**
   * Implementação de Busca Fuzzy
   * Verifica se os caracteres da query aparecem na string alvo mantendo a ordem relativa,
   * permitindo saltos entre caracteres (typo tolerance e atalhos de digitação).
   */
  const fuzzyMatch = (query: string, target: string): boolean => {
    const q = query.toLowerCase().replace(/\s/g, '');
    const t = target.toLowerCase();
    
    // Se a query estiver contida diretamente, match imediato
    if (t.includes(q)) return true;
    
    // Algoritmo de subsequência para busca fluida
    let qIdx = 0;
    let tIdx = 0;
    while (qIdx < q.length && tIdx < t.length) {
      if (q[qIdx] === t[tIdx]) {
        qIdx++;
      }
      tIdx++;
    }
    
    // Se percorremos toda a query, é um match
    if (qIdx === q.length) return true;

    // Adicional: Match por palavras separadas (permite buscar "UTI monitor" em "Monitor - UTI Adulto")
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (words.length > 1) {
      return words.every(word => t.includes(word));
    }

    return false;
  };

  const handleUpdateAsset = (id: string, field: keyof Asset, value: any) => {
    setAssets(prev => prev.map(a => {
      if (a.id === id) {
        const updated = { ...a, [field]: value };
        saveAsset(updated);
        
        if (field === 'status' && value === AssetStatus.CRITICAL) {
          const msg = `Alerta: O ativo ${a.name} foi marcado como crítico. Verifique o painel de ordens de serviço.`;
          playVoiceAlert(msg);
          logEvent(EventType.ALERT, msg, 'critical');
        }

        if (field === 'nextMaintenance') {
          const checkDate = new Date(value);
          const today = new Date();
          const diffDays = Math.ceil((checkDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 7 && diffDays >= 0) {
             const msg = `Manutenção programada para ${a.name} está próxima: dia ${checkDate.toLocaleDateString()}.`;
             playVoiceAlert(msg);
             logEvent(EventType.ALERT, msg, 'warning');
          }
        }

        setSaveStatus(id);
        setTimeout(() => setSaveStatus(null), 2000);
        return updated;
      }
      return a;
    }));
  };

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.location) return;

    const createdAsset = addAsset(newAsset);
    setAssets([createdAsset, ...assets]);
    setIsFormOpen(false);
    
    const msg = `Novo ativo registrado com sucesso: ${createdAsset.name} no setor ${createdAsset.location}.`;
    playVoiceAlert(msg);
    
    // Reset form
    setNewAsset({
      name: '',
      category: 'Médico',
      location: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      warrantyUntil: new Date().toISOString().split('T')[0],
      lastMaintenance: new Date().toISOString().split('T')[0],
      nextMaintenance: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: AssetStatus.OPERATIONAL
    });
  };

  const calculateHealth = (lastMaintenance: string) => {
    const lastDate = new Date(lastMaintenance);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 180) return { label: 'Risco Alto', color: 'text-red-500', score: 20 };
    if (diffDays > 90) return { label: 'Risco Médio', color: 'text-amber-500', score: 60 };
    return { label: 'Saudável', color: 'text-green-500', score: 95 };
  };

  const checkMaintenanceAlert = (nextDateStr: string) => {
    const nextDate = new Date(nextDateStr);
    const today = new Date();
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'ATRASADO', color: 'bg-red-600 text-white', icon: '⛔' };
    if (diffDays <= 7) return { label: 'URGENTE', color: 'bg-orange-500 text-white animate-pulse', icon: '⚠️' };
    if (diffDays <= 30) return { label: 'PRÓXIMO', color: 'bg-amber-100 text-amber-700', icon: '📅' };
    return null;
  };

  const filteredAssets = assets.filter(a => {
    if (!filter) return true;
    
    // Tenta match fuzzy nos campos principais
    return fuzzyMatch(filter, a.name) || 
           fuzzyMatch(filter, a.id) ||
           fuzzyMatch(filter, a.location) ||
           fuzzyMatch(filter, a.manufacturer || '');
  });

  const sectorSuggestions = Array.from(new Set([
    ...CHECKLIST_CATEGORIES,
    ...assets.map(a => a.location.split(' - ')[0])
  ]));

  return (
    <div className="p-8 animate-in fade-in duration-500 min-h-screen">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            Inventário de Ativos Sincronizado
            {saveStatus && <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded animate-bounce">SINCERIZADO ✓</span>}
          </h1>
          <p className="text-slate-500">Gestão inteligente com busca fuzzy e análise de risco preventiva.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/scanner')}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg transition-all flex items-center gap-2 text-sm"
          >
            <span>📷</span> SCANNER QR
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all flex items-center gap-2 text-sm"
          >
            <span>➕</span> NOVO ATIVO
          </button>
        </div>
      </header>

      {/* MODAL DE CADASTRO EXPANDIDO */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Cadastrar Novo Equipamento</h2>
                <p className="text-slate-400 text-xs">Preencha os detalhes técnicos para registro no banco hospitalar.</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleCreateAsset} className="p-8">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Ativo</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                    placeholder="Ex: Monitor Multiparamétrico"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Setor / Unidade</label>
                  <input 
                    required
                    list="sectors"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                    placeholder="Ex: UTI Adulto / Bloco B"
                    value={newAsset.location}
                    onChange={(e) => setNewAsset({...newAsset, location: e.target.value})}
                  />
                  <datalist id="sectors">
                    {sectorSuggestions.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                    value={newAsset.category}
                    onChange={(e) => setNewAsset({...newAsset, category: e.target.value as any})}
                  >
                    <option value="Médico">Médico</option>
                    <option value="Infraestrutura">Infraestrutura</option>
                    <option value="Segurança">Segurança</option>
                    <option value="Conforto">Conforto</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fabricante</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                    placeholder="Ex: Phillips / GE"
                    value={newAsset.manufacturer}
                    onChange={(e) => setNewAsset({...newAsset, manufacturer: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Próxima Prev.</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                    value={newAsset.nextMaintenance}
                    onChange={(e) => setNewAsset({...newAsset, nextMaintenance: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Garantia Até</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                    value={newAsset.warrantyUntil}
                    onChange={(e) => setNewAsset({...newAsset, warrantyUntil: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Inicial</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none"
                    value={newAsset.status}
                    onChange={(e) => setNewAsset({...newAsset, status: e.target.value as AssetStatus})}
                  >
                    {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all"
                >
                  FINALIZAR CADASTRO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TABELA DE ATIVOS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Pesquisar por patrimônio, nome ou sala (Busca Fuzzy)..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <select 
            className="bg-white border border-slate-200 rounded-xl text-sm px-4 py-3 outline-none font-medium text-slate-600"
            onChange={(e) => setFilter(e.target.value === 'Todos' ? '' : e.target.value)}
          >
            <option value="Todos">Todos os Setores</option>
            {Array.from(new Set(assets.map(a => a.location.split(' - ')[0]))).map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/30">
                <th className="px-8 py-5">Identificação do Ativo</th>
                <th className="px-8 py-5">Setor / Unidade</th>
                <th className="px-8 py-5">Saúde / Próxima Prev.</th>
                <th className="px-8 py-5">Status Operacional</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic">
                    Nenhum ativo encontrado para os critérios de busca.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const health = calculateHealth(asset.lastMaintenance);
                  const mAlert = checkMaintenanceAlert(asset.nextMaintenance);
                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/80 transition-all group animate-in slide-in-from-left duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-xl group-hover:rotate-6 transition-transform shrink-0">
                            {asset.category === 'Médico' ? '🏥' : asset.category === 'Infraestrutura' ? '⚡' : '🛡️'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <input 
                              className="font-bold text-slate-800 text-sm bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none transition-colors truncate"
                              defaultValue={asset.name}
                              onBlur={(e) => handleUpdateAsset(asset.id, 'name', e.target.value)}
                            />
                            <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{asset.id} • {asset.manufacturer || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <input 
                          className="text-xs font-bold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none transition-colors"
                          defaultValue={asset.location}
                          onBlur={(e) => handleUpdateAsset(asset.id, 'location', e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400 uppercase font-medium">{asset.category}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${health.score > 80 ? 'bg-green-500' : health.score > 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${health.score}%` }}></div>
                            </div>
                            <span className={`text-[9px] font-black uppercase ${health.color}`}>{health.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <input 
                                type="date"
                                className={`text-[10px] font-bold px-2 py-1 rounded-lg border focus:ring-2 outline-none transition-all ${mAlert ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}
                                value={asset.nextMaintenance}
                                onChange={(e) => handleUpdateAsset(asset.id, 'nextMaintenance', e.target.value)}
                             />
                             {mAlert && (
                               <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${mAlert.color}`} title={mAlert.label}>
                                 {mAlert.icon}
                               </span>
                             )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <select 
                          value={asset.status}
                          onChange={(e) => handleUpdateAsset(asset.id, 'status', e.target.value)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight border outline-none transition-all cursor-pointer ${getStatusColor(asset.status)}`}
                        >
                          {Object.values(AssetStatus).map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => navigate('/scanner')}
                             className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                             title="Visualizar QR"
                           >
                             📷
                           </button>
                           <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all">
                             Histórico
                           </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="mt-8 flex justify-center gap-8 border-t border-slate-100 pt-8">
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
           <span className="w-3 h-3 bg-green-500 rounded-full"></span> Operacional
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
           <span className="w-3 h-3 bg-amber-500 rounded-full"></span> Manutenção
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
           <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span> Crítico
        </div>
      </footer>
    </div>
  );
};

export default Assets;
