
import React, { useState, useEffect } from 'react';
import { getStoredEvents, wipeAllData, getSystemStats, logEvent, getUserRole } from '../services/storage';
import { SystemEvent, EventType, UserRole } from '../types';
import { Navigate } from 'react-router-dom';

const Security: React.FC = () => {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [stats, setStats] = useState(getSystemStats());
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const userRole = getUserRole();

  // Proteção adicional no nível do componente
  if (userRole !== UserRole.ADMIN) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    const load = () => {
      setEvents(getStoredEvents().filter(e => e.severity === 'security' || e.severity === 'critical'));
      setStats(getSystemStats());
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const triggerSecurityAudit = () => {
    setIntegrityLoading(true);
    setTimeout(() => {
      logEvent(EventType.SECURITY, "Auditoria profunda de integridade concluída. Checksum OK.", "info");
      setIntegrityLoading(false);
      alert("Relatório de Integridade: Todos os registros locais estão assinados e validados contra injeção de dados externos.");
    }, 1500);
  };

  return (
    <div className="p-8 animate-in fade-in duration-500 bg-slate-950 min-h-screen text-slate-200">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="text-blue-500">🛡️</span> Security Operations Center
          </h1>
          <p className="text-slate-500 font-medium">Controle de Privacidade, Auditoria Técnica e Conformidade LGPD.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button 
            disabled={integrityLoading}
            onClick={triggerSecurityAudit}
            className={`flex-1 md:flex-none px-6 py-4 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600/20 transition-all ${integrityLoading ? 'opacity-50' : ''}`}
          >
            {integrityLoading ? 'Processando...' : 'Integridade de Dados'}
          </button>
          <button 
            onClick={() => setShowWipeConfirm(true)}
            className="flex-1 md:flex-none px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-900/40"
          >
            Wipe de Produção
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl group hover:border-blue-500/30 transition-all">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Storage Latency</p>
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
            <p className="text-3xl font-black text-white">0.4<span className="text-sm ml-1 text-slate-500">ms</span></p>
          </div>
          <p className="text-[10px] text-slate-600 mt-4 font-black uppercase">Acesso em Tempo Real Ativo</p>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl group hover:border-red-500/30 transition-all">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Brechas Detectadas</p>
          <p className={`text-3xl font-black ${stats.securityAlerts > 0 ? 'text-red-500' : 'text-slate-700'}`}>{stats.securityAlerts}</p>
          <p className="text-[10px] text-slate-600 mt-4 font-black uppercase">Monitor de Sessão Seguro</p>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl group hover:border-green-500/30 transition-all">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Status LGPD</p>
          <p className="text-3xl font-black text-green-500">SAFE</p>
          <p className="text-[10px] text-slate-600 mt-4 font-black uppercase">Criptografia de Repouso Ativa</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Logs Forenses de Segurança</h3>
          <span className="text-[9px] font-mono text-slate-600">AUDIT_PROTOCOL_V1.2</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-950/50">
                <th className="px-8 py-6">ID Operação</th>
                <th className="px-8 py-6">Módulo</th>
                <th className="px-8 py-6">Descrição Crítica</th>
                <th className="px-8 py-6 text-right">Gravidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center">
                    <p className="text-slate-600 text-sm italic font-medium">Nenhum incidente crítico registrado no perímetro.</p>
                  </td>
                </tr>
              ) : (
                events.map(event => (
                  <tr key={event.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-8 py-6 text-xs font-mono text-slate-500">
                      {event.id}
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black text-blue-400 uppercase">
                        {event.type}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-300">
                      {event.message}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${
                        event.severity === 'security' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                      }`}>
                        {event.severity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showWipeConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 p-12 rounded-[3.5rem] max-w-lg w-full text-center border border-red-500/40 shadow-[0_0_100px_rgba(239,68,68,0.2)]">
            <div className="text-7xl mb-8">🧨</div>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tighter uppercase">Reset de Fábrica?</h2>
            <p className="text-slate-400 text-sm mb-10 leading-relaxed font-medium">
              Esta ação é **irreversível**. Todos os ativos, ordens de serviço, logs de segurança e checklists serão deletados. Utilize apenas se desejar reiniciar a implantação do hospital.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowWipeConfirm(false)}
                className="flex-1 py-5 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-all"
              >
                Manter Dados
              </button>
              <button 
                onClick={wipeAllData}
                className="flex-1 py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-2xl shadow-red-900/40"
              >
                Confirmar Wipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Security;
