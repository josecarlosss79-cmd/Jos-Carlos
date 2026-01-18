
import React, { useState, useEffect } from 'react';
import { getStoredChecklist, getStoredEvents, getStoredOrders, getSystemStats, getStoredAssets } from '../services/storage';
import { ChecklistItem, SystemEvent, OS, EventType, ChecklistStatus, Asset, OSStatus } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'events' | 'os' | 'conformity'>('events');
  const [conformityView, setConformityView] = useState<'list' | 'grouped'>('list');
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [orders, setOrders] = useState<OS[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState(getSystemStats());
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    setEvents(getStoredEvents());
    setOrders(getStoredOrders());
    setChecklist(getStoredChecklist());
    setAssets(getStoredAssets());
    setStats(getSystemStats());
  }, []);

  const totalChecklist = checklist.length;
  const okCount = checklist.filter(i => i.status === ChecklistStatus.OK).length;
  const complianceIndex = totalChecklist > 0 ? Math.round((okCount / totalChecklist) * 100) : 0;

  const categoryStatsMap = checklist.reduce((acc: any, item) => {
    if (!acc[item.category]) {
      acc[item.category] = { total: 0, ok: 0, pending: 0, fail: 0 };
    }
    acc[item.category].total++;
    if (item.status === ChecklistStatus.OK) acc[item.category].ok++;
    else if (item.status === ChecklistStatus.PENDING) acc[item.category].pending++;
    else if (item.status === ChecklistStatus.FAIL) acc[item.category].fail++;
    return acc;
  }, {});

  const categoriesStats = Object.keys(categoryStatsMap).map(cat => ({
    name: cat,
    ...categoryStatsMap[cat],
    percent: Math.round((categoryStatsMap[cat].ok / categoryStatsMap[cat].total) * 100)
  })).sort((a, b) => a.percent - b.percent);

  const shareViaWhatsApp = () => {
    let message = `*🛡️ HospGuardian - Relatório de Gestão*\n`;
    message += `_Gerado em: ${new Date().toLocaleString('pt-BR')}_\n\n`;
    message += `*KPIs GERAIS:*\n`;
    message += `✅ Conformidade: ${complianceIndex}%\n`;
    message += `🏥 Ativos Monitorados: ${assets.length}\n`;
    message += `🛠️ OS Pendentes: ${stats.openOrders}\n`;
    message += `🚨 Alertas de Segurança: ${stats.securityAlerts}\n\n`;

    if (activeTab === 'os') {
      message += `*RESUMO DE ORDENS (TOP 3):*\n`;
      orders.filter(o => o.status !== OSStatus.COMPLETED).slice(0, 3).forEach(o => {
        message += `- [${o.priority}] ${o.assetName}: ${o.description.substring(0, 30)}...\n`;
      });
    } else if (activeTab === 'conformity') {
      message += `*SAÚDE POR SETOR:*\n`;
      categoriesStats.slice(0, 3).forEach(cat => {
        message += `- ${cat.name}: ${cat.percent}% OK\n`;
      });
    }

    message += `\n_Enviado via Núcleo de Auditoria HospGuardian_`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (activeTab === 'events') {
      csvContent += "Data,Tipo,Usuario,Mensagem,Gravidade\n";
      events.forEach(e => csvContent += `${e.timestamp},${e.type},${e.user},"${e.message}",${e.severity}\n`);
    } else if (activeTab === 'os') {
      csvContent += "ID,Ativo,Descricao,Status,Prioridade,Criado Em\n";
      orders.forEach(o => csvContent += `${o.id},${o.assetName},"${o.description}",${o.status},${o.priority},${o.createdAt}\n`);
    } else if (activeTab === 'conformity') {
      csvContent += "Equipamento,Categoria,Status,Ultima Verificacao,Observacoes\n";
      checklist.forEach(i => csvContent += `${i.label},${i.category},${i.status},${i.lastChecked},"${i.observations}"\n`);
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hospguardian_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const generatePDF = (mode: 'general' | 'assets' | 'specific_category', categoryFilter?: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const dateStr = new Date().toLocaleString('pt-BR');
    
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("HospGuardian", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Auditoria Técnica de Ativos Hospitalares", 14, 28);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${dateStr}`, pageWidth - 14, 20, { align: 'right' });
    
    let title = "Relatório Geral de Atividade";
    if (mode === 'assets') title = "Inventário Completo de Ativos";
    if (mode === 'specific_category') title = `Relatório de Ativos: ${categoryFilter}`;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 55);

    if (mode === 'assets' || mode === 'specific_category') {
      const dataToReport = mode === 'specific_category' 
        ? assets.filter(a => a.category === categoryFilter)
        : assets;

      const tableData = dataToReport.map(a => [
        a.id, a.name, a.category, a.location, a.status, new Date(a.nextMaintenance).toLocaleDateString('pt-BR')
      ]);

      autoTable(doc, {
        startY: 65,
        head: [['ID/Patrimônio', 'Equipamento', 'Categoria', 'Localização', 'Status', 'Próxima Prev.']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
        bodyStyles: { fontSize: 8 }
      });
    } else {
      const tableData = events.map(e => [
        new Date(e.timestamp).toLocaleString('pt-BR'), e.type, e.user, e.message, e.severity.toUpperCase()
      ]);
      
      autoTable(doc, {
        startY: 65,
        head: [['Horário', 'Tipo', 'Usuário', 'Mensagem', 'Gravidade']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 3: { cellWidth: 70 } }
      });
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount} - Autenticado HospGuardian`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`hospguardian_relatorio_${mode}_${new Date().toISOString().split('T')[0]}.pdf`);
    setIsExportModalOpen(false);
  };

  return (
    <div className="p-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Auditoria & Inteligência</h1>
          <p className="text-slate-500 font-medium">Extração de dados para conformidade hospitalar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={shareViaWhatsApp}
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-100"
          >
            <span>📱</span> Enviar WhatsApp
          </button>
          <button 
            onClick={downloadCSV}
            className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-200 flex items-center gap-2 transition-all active:scale-95"
          >
            <span>📄</span> CSV
          </button>
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 flex items-center gap-2 transition-all shadow-xl shadow-blue-200 border border-blue-500"
          >
            <span>🛡️</span> Exportar Relatório
          </button>
        </div>
      </header>

      {isExportModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Gerador de Documentos</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Selecione o escopo do relatório</p>
              </div>
              <button onClick={() => setIsExportModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-white/10 transition-colors">✕</button>
            </div>
            
            <div className="p-8 space-y-3">
              <button onClick={() => generatePDF('general')} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group">
                <span className="text-2xl group-hover:scale-110 transition-transform">📋</span>
                <div>
                  <h4 className="font-black text-slate-800 text-sm uppercase">Relatório Geral (PDF)</h4>
                  <p className="text-[10px] text-slate-500">Timeline completa de eventos e segurança.</p>
                </div>
              </button>

              <button onClick={() => generatePDF('assets')} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group">
                <span className="text-2xl group-hover:scale-110 transition-transform">🏥</span>
                <div>
                  <h4 className="font-black text-slate-800 text-sm uppercase">Inventário de Ativos (PDF)</h4>
                  <p className="text-[10px] text-slate-500">Listagem de equipamentos e patrimônios.</p>
                </div>
              </button>

              <button onClick={shareViaWhatsApp} className="w-full p-5 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-4 hover:border-green-500 hover:bg-green-100 transition-all text-left group">
                <span className="text-2xl group-hover:scale-110 transition-transform">📱</span>
                <div>
                  <h4 className="font-black text-green-800 text-sm uppercase text-green-700">Resumo via WhatsApp</h4>
                  <p className="text-[10px] text-green-600">Enviar KPIs e destaques críticos via chat.</p>
                </div>
              </button>

              <div className="pt-4 border-t border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Relatório por Categoria</p>
                 <div className="grid grid-cols-2 gap-2">
                    {['Médico', 'Infraestrutura', 'Segurança', 'Conforto'].map(cat => (
                      <button key={cat} onClick={() => generatePDF('specific_category', cat)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                        {cat}
                      </button>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        {[
          { label: 'Conformidade', value: `${complianceIndex}%`, sub: `${okCount} de ${totalChecklist} OK`, color: complianceIndex > 80 ? 'text-green-600' : 'text-amber-600' },
          { label: 'Patrimônio', value: assets.length.toString(), sub: 'Ativos Cadastrados', color: 'text-blue-600' },
          { label: 'Incidentes', value: stats.totalEvents.toString(), sub: 'Logs de Sistema', color: 'text-slate-600' },
          { label: 'OS Pendentes', value: stats.openOrders.toString(), sub: 'Aguardando Reparo', color: 'text-orange-600' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[9px] md:text-[10px] text-slate-400 uppercase font-black mb-1 tracking-wider">{kpi.label}</p>
            <p className={`text-xl md:text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[9px] md:text-[10px] text-slate-400 mt-1 font-bold">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-4 md:gap-6 mb-8 border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-hide">
        {[
          { id: 'events', label: 'Eventos', icon: '🕒' },
          { id: 'os', label: 'OS Flow', icon: '🛠️' },
          { id: 'conformity', label: 'Compliance', icon: '✅' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 px-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 relative ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <span>{tab.icon}</span> {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        {activeTab === 'events' && (
          <div className="p-0 animate-in fade-in duration-300 overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-5">Horário</th>
                  <th className="px-8 py-5">Tipo</th>
                  <th className="px-8 py-5">Usuário</th>
                  <th className="px-8 py-5">Evento</th>
                  <th className="px-8 py-5">Grd.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.length === 0 ? (
                  <tr><td colSpan={5} className="p-20 text-center text-slate-300 italic font-black uppercase text-[10px]">Aguardando captura de logs...</td></tr>
                ) : (
                  events.map(event => (
                    <tr key={event.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5 text-[10px] font-mono text-slate-500">{new Date(event.timestamp).toLocaleString('pt-BR')}</td>
                      <td className="px-8 py-5"><span className="px-2 py-1 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700">{event.type}</span></td>
                      <td className="px-8 py-5 text-[10px] font-black text-slate-700">{event.user}</td>
                      <td className="px-8 py-5 text-xs text-slate-600 font-bold">{event.message}</td>
                      <td className="px-8 py-5"><div className={`w-2 h-2 rounded-full ${event.severity === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'os' && (
          <div className="p-0 animate-in fade-in duration-300 overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-5">Código</th>
                  <th className="px-8 py-5">Ativo</th>
                  <th className="px-8 py-5">Prioridade</th>
                  <th className="px-8 py-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr><td colSpan={4} className="p-20 text-center text-slate-300 italic font-black uppercase text-[10px]">Nenhuma OS registrada.</td></tr>
                ) : (
                  orders.map(os => (
                    <tr key={os.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5 font-black text-blue-600 text-[10px]">{os.id}</td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-black text-slate-800">{os.assetName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{os.location}</p>
                      </td>
                      <td className="px-8 py-5"><span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${os.priority === 'Alta' || os.priority === 'Crítica' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{os.priority}</span></td>
                      <td className="px-8 py-5 text-[10px] font-black uppercase text-slate-500">{os.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'conformity' && (
          <div className="p-0 animate-in fade-in duration-300 overflow-x-auto">
             <div className="p-6 md:p-8 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-100">
               <div className="flex-1 w-full">
                 <div className="flex justify-between items-end mb-3">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Compliance</h3>
                   <span className="text-xl font-black text-slate-900">{complianceIndex}%</span>
                 </div>
                 <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                   <div className={`h-full transition-all duration-1000 ${complianceIndex > 80 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${complianceIndex}%` }} />
                 </div>
               </div>
               
               <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                 <button onClick={() => setConformityView('list')} className={`px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${conformityView === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Lista</button>
                 <button onClick={() => setConformityView('grouped')} className={`px-4 md:px-6 py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${conformityView === 'grouped' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Setores</button>
               </div>
             </div>

             {conformityView === 'list' ? (
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-8 py-5">Equipamento</th>
                      <th className="px-8 py-5">Categoria</th>
                      <th className="px-8 py-5 text-center">Status</th>
                      <th className="px-8 py-5">Inspeção</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {checklist.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5 font-bold text-slate-800 text-sm">{item.label}</td>
                        <td className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">{item.category}</td>
                        <td className="px-8 py-5 text-center"><span className="px-2 py-1 rounded text-[9px] font-black uppercase bg-green-100 text-green-700">{item.status}</span></td>
                        <td className="px-8 py-5 text-[10px] font-mono text-slate-500">{item.lastChecked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             ) : (
               <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                 {categoriesStats.map((cat, idx) => (
                   <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 hover:bg-white transition-all group">
                     <div className="flex justify-between items-start mb-6">
                       <h4 className="text-[11px] font-black text-slate-800 uppercase leading-tight">{cat.name}</h4>
                       <span className={`text-2xl font-black ${cat.percent > 80 ? 'text-green-600' : 'text-amber-600'}`}>{cat.percent}%</span>
                     </div>
                     <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-4"><div className={`h-full bg-blue-600`} style={{ width: `${cat.percent}%` }} /></div>
                     <p className="text-[10px] text-slate-400 font-bold uppercase">{cat.total} Ativos Monitorados</p>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
