
import React, { useState, useEffect } from 'react';
import { getStoredStock, saveStockItem, addStockItem, logEvent } from '../services/storage';
import { StockItem, EventType } from '../types';
import { playVoiceAlert } from '../services/gemini';

const Stock: React.FC = () => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [filter, setFilter] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItem, setNewItem] = useState<Omit<StockItem, 'id'>>({
    name: '',
    category: 'Geral',
    quantity: 0,
    minQuantity: 5,
    unit: 'un',
    lastRestock: new Date().toISOString().split('T')[0],
    location: 'Almoxarifado'
  });

  useEffect(() => {
    setStock(getStoredStock());
  }, []);

  const handleAdjustQuantity = (id: string, delta: number) => {
    setStock(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        const updated = { ...item, quantity: newQty };
        saveStockItem(updated);
        
        if (newQty < item.minQuantity && item.quantity >= item.minQuantity) {
          const msg = `Alerta: Estoque crítico para ${item.name}. Restam apenas ${newQty} unidades.`;
          playVoiceAlert(msg);
          logEvent(EventType.ALERT, msg, 'warning');
        }
        
        return updated;
      }
      return item;
    }));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = addStockItem(newItem);
    setStock(prev => [...prev, created]);
    setIsAddOpen(false);
    playVoiceAlert(`Novo insumo ${created.name} cadastrado com sucesso.`);
  };

  const filteredStock = stock.filter(i => 
    i.name.toLowerCase().includes(filter.toLowerCase()) || 
    i.category.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-8 animate-in fade-in duration-500 min-h-screen">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestão de Estoque & Peças</h1>
          <p className="text-slate-500 font-medium">Monitoramento de insumos para manutenções preventivas e corretivas.</p>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all flex items-center gap-2"
        >
          <span>➕</span> ADICIONAR ITEM
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Itens</p>
          <p className="text-2xl font-bold text-slate-900">{stock.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-l-4 border-l-red-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reposição Necessária</p>
          <p className="text-2xl font-bold text-red-600">{stock.filter(i => i.quantity < i.minQuantity).length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Categorias Ativas</p>
          <p className="text-2xl font-bold text-blue-600">{new Set(stock.map(i => i.category)).size}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Geral</p>
          <p className="text-lg font-bold text-green-600">Sincronizado</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <span className="absolute left-4 top-1/2 -translate-y-1/2">🔍</span>
            <input 
              type="text" 
              placeholder="Pesquisar insumo ou categoria..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/30">
                <th className="px-8 py-5">Item / Insumo</th>
                <th className="px-8 py-5">Categoria</th>
                <th className="px-8 py-5">Quantidade Atual</th>
                <th className="px-8 py-5">Estoque Mínimo</th>
                <th className="px-8 py-5 text-right">Ajustes Rápidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStock.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-xl">📦</div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.id} • {item.location}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-black ${item.quantity < item.minQuantity ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
                        {item.quantity} {item.unit}
                      </span>
                      {item.quantity < item.minQuantity && (
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[8px] font-black uppercase">Crítico</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-slate-400 font-bold text-sm">
                    {item.minQuantity} {item.unit}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleAdjustQuantity(item.id, -1)}
                        className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors"
                      >
                        ➖
                      </button>
                      <button 
                        onClick={() => handleAdjustQuantity(item.id, 1)}
                        className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors"
                      >
                        ➕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Novo Item de Estoque</h2>
                <p className="text-slate-400 text-xs">Registro de insumos técnicos.</p>
              </div>
              <button onClick={() => setIsAddOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-8 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome do Item</label>
                <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Quantidade Inicial</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mínimo para Alerta</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm" value={newItem.minQuantity} onChange={e => setNewItem({...newItem, minQuantity: parseInt(e.target.value)})} />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200">
                Cadastrar Insumo
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
