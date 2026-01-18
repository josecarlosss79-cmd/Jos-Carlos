
import React, { useState, useEffect } from 'react';
import { getStoredWorkSchedule } from '../services/storage';
import { WorkScheduleTask } from '../types';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WorkSchedule: React.FC = () => {
  const [tasks, setTasks] = useState<WorkScheduleTask[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setTasks(getStoredWorkSchedule());
    const interval = setInterval(() => setTasks(getStoredWorkSchedule()), 5000);
    return () => clearInterval(interval);
  }, []);

  const getTasksByMonth = (monthIndex: number) => {
    const monthTasks: { task: WorkScheduleTask, date: Date }[] = [];
    
    tasks.forEach(task => {
      task.occurrences.forEach(occStr => {
        const occDate = new Date(occStr);
        if (occDate.getMonth() === monthIndex && occDate.getFullYear() === selectedYear) {
          monthTasks.push({ task, date: occDate });
        }
      });
    });

    return monthTasks.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  return (
    <div className="p-8 animate-in fade-in duration-500 min-h-screen">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Ficha de Trabalho Anual</h1>
          <p className="text-slate-500 font-medium">Cronograma de Manutenção Preventiva e Inspeções Programadas.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
           {[selectedYear - 1, selectedYear, selectedYear + 1].map(year => (
             <button 
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${selectedYear === year ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
             >
               {year}
             </button>
           ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {MONTHS.map((month, idx) => {
          const monthTasks = getTasksByMonth(idx);
          const isCurrentMonth = new Date().getMonth() === idx && new Date().getFullYear() === selectedYear;

          return (
            <div 
              key={month} 
              className={`flex flex-col bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[300px] transition-all hover:shadow-xl group ${isCurrentMonth ? 'ring-2 ring-blue-500 ring-offset-4' : ''}`}
            >
              <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${isCurrentMonth ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-900'}`}>
                <h3 className="font-black text-sm uppercase tracking-widest">{month}</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isCurrentMonth ? 'bg-white/20' : 'bg-slate-200'}`}>
                  {monthTasks.length} Tarefas
                </span>
              </div>
              
              <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
                {monthTasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 opacity-50">
                    <span className="text-2xl">🍃</span>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Sem manutenções</p>
                  </div>
                ) : (
                  monthTasks.map(({ task, date }, tIdx) => (
                    <div key={`${task.id}-${tIdx}`} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all group/item">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                          Dia {date.getDate()}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${task.status === 'Realizado' ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
                      </div>
                      <h4 className="text-xs font-black text-slate-800 leading-tight mb-1 group-hover/item:text-blue-600 transition-colors">
                        {task.assetName}
                      </h4>
                      <div className="flex items-center gap-1.5 opacity-60">
                         <span className="text-[9px] font-bold text-slate-500 uppercase">{task.location}</span>
                      </div>
                      {task.technician && (
                        <p className="mt-2 text-[8px] font-black text-slate-400 uppercase">Técnico: {task.technician}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkSchedule;
