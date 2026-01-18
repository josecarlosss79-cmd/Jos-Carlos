
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import OSQuickForm from './OSQuickForm';
import { isMobile } from '../services/device';
import { subscribeToSync, getUserRole, setUserRole, isOnline, getSyncQueueCount } from '../services/storage';
import { UserRole } from '../types';

const navItems = [
  { name: 'Dashboard', path: '/', icon: '📊', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN] },
  { name: 'Scanner', path: '/scanner', icon: '📷', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN] },
  { name: 'Checklist', path: '/checklist', icon: '✅', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN] },
  { name: 'Ordens', path: '/orders', icon: '🛠️', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN] },
  { name: 'Ativos', path: '/assets', icon: '🏥', roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { name: 'Estoque', path: '/stock', icon: '📦', roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { name: 'Relatórios', path: '/reports', icon: '📈', roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { name: 'Segurança', path: '/security', icon: '🛡️', roles: [UserRole.ADMIN] },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [isOSFormOpen, setIsOSFormOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState(isOnline());
  const [pendingSyncs, setPendingSyncs] = useState(getSyncQueueCount());
  const [currentRole, setCurrentRole] = useState(getUserRole());
  const mobile = isMobile();

  useEffect(() => {
    const handleSyncChange = () => {
      setSyncStatus(isOnline());
      setPendingSyncs(getSyncQueueCount());
    };
    window.addEventListener('online', handleSyncChange);
    window.addEventListener('offline', handleSyncChange);
    
    subscribeToSync(() => {
      setCurrentRole(getUserRole());
      setPendingSyncs(getSyncQueueCount());
    });

    return () => {
      window.removeEventListener('online', handleSyncChange);
      window.removeEventListener('offline', handleSyncChange);
    };
  }, []);

  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
    setCurrentRole(role);
    window.location.reload();
  };

  const filteredItems = navItems.filter(item => item.roles.includes(currentRole));

  if (mobile) {
    return (
      <>
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white h-16 flex items-center justify-around z-[100] border-t border-slate-800 safe-area-bottom px-2">
          {filteredItems.slice(0, 4).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 transition-all flex-1 py-2 ${
                location.pathname === item.path ? 'text-blue-400 scale-110' : 'text-slate-500'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-tighter text-center">{item.name}</span>
            </Link>
          ))}
          <div className="flex-1 flex justify-center">
            <button 
              onClick={() => setIsOSFormOpen(true)}
              className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center -mt-10 shadow-[0_0_20px_rgba(37,99,235,0.4)] border-4 border-slate-900 active:scale-90 transition-transform"
            >
              <span className="text-xl text-white">➕</span>
            </button>
          </div>
        </div>
        
        {isOSFormOpen && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsOSFormOpen(false)} />
            <div className="relative w-full bg-white h-screen shadow-2xl animate-in slide-in-from-bottom flex flex-col">
              <OSQuickForm onClose={() => setIsOSFormOpen(false)} />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="w-64 h-screen bg-slate-900 text-white flex flex-col fixed left-0 top-0 z-50">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">🛡️</div>
            <h1 className="font-bold text-sm tracking-tight">HospGuardian</h1>
          </div>
          <div className="relative">
             <div className={`w-2 h-2 rounded-full ${syncStatus ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 animate-pulse'}`} />
             {pendingSyncs > 0 && (
               <span className="absolute -top-3 -right-3 bg-amber-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                 {pendingSyncs}
               </span>
             )}
          </div>
        </div>

        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Perfil Ativo</p>
           <select 
            value={currentRole}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-[11px] font-bold text-blue-400 outline-none"
           >
             {Object.values(UserRole).map(role => (
               <option key={role} value={role}>{role}</option>
             ))}
           </select>
        </div>
        
        <div className="p-4">
          <button 
            onClick={() => setIsOSFormOpen(true)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
          >
            ➕ NOVA ORDEM
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                location.pathname === item.path 
                  ? 'bg-slate-800 text-white border-l-4 border-blue-500' 
                  : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-bold text-xs uppercase tracking-tight">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase mb-2">
             <span>Sincronismo Cloud</span>
             <span className={syncStatus ? 'text-green-500' : 'text-red-500'}>{syncStatus ? 'Ativo' : 'Offline'}</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
             <div className={`h-full transition-all duration-1000 ${syncStatus ? 'w-full bg-green-500' : 'w-1/2 bg-amber-500 animate-pulse'}`}></div>
          </div>
          {pendingSyncs > 0 && (
            <p className="text-[8px] font-black text-amber-500 uppercase mt-2 text-center">
              {pendingSyncs} Registros em fila local
            </p>
          )}
        </div>
      </div>

      {isOSFormOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsOSFormOpen(false)} />
          <div className="relative w-full max-w-lg bg-white h-screen shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <OSQuickForm onClose={() => setIsOSFormOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
