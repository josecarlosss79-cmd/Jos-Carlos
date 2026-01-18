
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import { generatePredictiveReport } from '../services/gemini';
import { getSystemStats, getStoredAssets, getStoredOrders, isOnline, subscribeToSync, getStoredTelemetry } from '../services/storage';
import { isMobile } from '../services/device';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(getSystemStats());
  const [telemetry, setTelemetry] = useState(getStoredTelemetry());
  const [onlineStatus, setOnlineStatus] = useState(isOnline());
  const mobile = isMobile();

  useEffect(() => {
    subscribeToSync(() => {
      setStats(getSystemStats());
      setTelemetry(getStoredTelemetry());
    });

    const handleStatusChange = () => setOnlineStatus(isOnline());
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    const fetchAnalysis = async () => {
      const assets = getStoredAssets();
      if (mobile || assets.length < 3) {
        setLoading(false);
        return;
      }
      try {
        const data = await generatePredictiveReport(assets, getStoredOrders());
        setAiAnalysis(data);
      } catch (err) {
        console.error("Cloud Insight Fail:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalysis();
    
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, [mobile]);

  const availabilityData = [
    { name: 'Operacional', value: stats.operationalAssets, color: '#10b981' },
    { name: 'Manutenção', value: stats.maintenanceAssets, color: '#f59e0b' },
    { name: 'Crítico', value: stats.criticalAssets, color: '#ef4444' },
  ];

  const hasData = stats.totalChecklist > 0 || stats.operationalAssets > 0;

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in pb-24 md:pb-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">🛡️ Central HospGuardian</h1>
          <p className="text-xs text-slate-500 font-medium italic">Sincronismo Cross-Device: {onlineStatus ? 'OK' : 'PENDENTE'}</p>
        </div>
        {!mobile && (
           <div className={`px-3 py-1 rounded-full text-[10px] font-black border flex items-center gap-2 ${onlineStatus ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <span className={`w-2 h-2 rounded-full ${onlineStatus ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
              {onlineStatus ? 'NUVEM CONECTADA' : 'MODO LOCAL APENAS'}
           </div>
        )}
      </header>

      {!hasData ? (
        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl text-center">
          <span className="text-6xl block mb-6">🏥</span>
          <h2 className="text-3xl font-black mb-4 tracking-tighter">Bem-vindo ao HospGuardian</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">Para sincronizar seus dispositivos, cadastre os primeiros equipamentos no sistema mestre.</p>
          <button onClick={() => navigate('/assets')} className="px-8 py-4 bg-blue-600 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-700 transition-all">Começar Agora</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Checklist Diário</p>
              <p className="text-2xl font-black text-blue-600">{stats.verifiedToday}/{stats.totalChecklist}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Alertas IoT</p>
              <p className={`text-2xl font-black ${stats.criticalTelemetry > 0 ? 'text-red-600 animate-pulse' : 'text-slate-300'}`}>{stats.criticalTelemetry}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">OS Abertas</p>
              <p className="text-2xl font-black text-amber-600">{stats.openOrders}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Replicação</p>
              <p className="text-2xl font-black text-green-600">100%</p>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${mobile ? '' : 'lg:grid-cols-3'} gap-6`}>
            <div className={`${mobile ? '' : 'lg:col-span-2'} space-y-6`}>
              <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-1 h-3 bg-blue-600 rounded-full"></span> Timeline Sincronizada
                </h3>
                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                  {stats.recentActivity.map(event => (
                    <div key={event.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white transition-all">
                      <div className="text-xl">📡</div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{event.message}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase mt-1">{new Date(event.timestamp).toLocaleTimeString()} • {event.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {!mobile && (
              <div className="space-y-6">
                <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                   <div className="relative z-10">
                     <h3 className="font-black text-sm uppercase tracking-widest mb-4">🧠 Insights de IA</h3>
                     {loading ? (
                        <div className="h-20 flex items-center justify-center animate-pulse">⚙️ Analisando dados...</div>
                     ) : (
                        <p className="text-xs font-medium leading-relaxed opacity-90">
                           {aiAnalysis?.recommendations?.[0] || "IA monitorando ativos em tempo real para prevenção de falhas."}
                        </p>
                     )}
                   </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-widest mb-4">Disponibilidade Ativa</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={availabilityData} innerRadius={60} outerRadius={75} paddingAngle={5} dataKey="value">
                          {availabilityData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
