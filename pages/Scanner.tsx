
import React, { useRef, useEffect, useState } from 'react';
import jsQR from 'jsqr';
import { Asset } from '../types';
import { getStoredAssets, logEvent } from '../services/storage';
import AssetModal from '../components/AssetModal';
import { EventType } from '../types';

const Scanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(true);
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [recentScans, setRecentScans] = useState<Asset[]>([]);

  useEffect(() => {
    setAssets(getStoredAssets());
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        setError("Câmera não disponível ou permissão negada. Verifique as configurações do navegador.");
        setScanning(false);
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.height = videoRef.current.videoHeight;
            canvas.width = videoRef.current.videoWidth;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (code) {
              handleScan(code.data);
              return;
            }
          }
        }
      }
      if (scanning) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    startCamera();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanning]);

  const handleScan = (data: string) => {
    const asset = assets.find(a => a.id === data || data.includes(a.id));
    if (asset) {
      setIsSyncing(true);
      setTimeout(() => {
        setScannedAsset(asset);
        setScanning(false);
        setIsSyncing(false);
        setRecentScans(prev => [asset, ...prev.filter(a => a.id !== asset.id)].slice(0, 3));
        logEvent(EventType.SYSTEM, `Ativo ${asset.id} reconhecido via scanner.`, 'info');
      }, 600);
    }
  };

  const simulateScan = () => {
    const latestAssets = getStoredAssets();
    const randomAsset = latestAssets[Math.floor(Math.random() * latestAssets.length)];
    handleScan(randomAsset.id);
  };

  return (
    <div className="p-8 h-full flex flex-col bg-slate-50 min-h-screen">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Scanner Inteligente QR
            {isSyncing && <span className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded animate-pulse">SINCRONIZANDO...</span>}
          </h1>
          <p className="text-slate-500 font-medium">Reconhecimento de ativos em tempo real com comandos diretos ao banco hospitalar.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        <div className="lg:col-span-2 relative bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white group aspect-video">
          {scanning ? (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 qr-overlay relative rounded-3xl">
                  <div className="absolute inset-0 scanner-laser h-1 w-full z-10 opacity-80 blur-[2px]"></div>
                  
                  <div className="absolute -top-4 -left-4 w-12 h-12 border-t-8 border-l-8 border-blue-500 rounded-tl-3xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 border-t-8 border-r-8 border-blue-500 rounded-tr-3xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                  <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b-8 border-l-8 border-blue-500 rounded-bl-3xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-8 border-r-8 border-blue-500 rounded-br-3xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                </div>
              </div>

              <div className="absolute top-6 left-6">
                <div className="bg-slate-900/60 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-white text-[10px] font-black uppercase tracking-widest">FEED AO VIVO</span>
                </div>
              </div>

              <div className="absolute bottom-12 inset-x-0 flex flex-col items-center gap-6">
                <button 
                  onClick={simulateScan}
                  className="px-8 py-4 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/40 border border-slate-100"
                >
                  🚀 Forçar Reconhecimento (Demo)
                </button>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-8 space-y-6">
              <div className="w-24 h-24 bg-green-500 text-white rounded-[2rem] flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(34,197,94,0.4)] animate-bounce">
                ✓
              </div>
              <div className="text-center">
                <h2 className="text-white text-3xl font-black uppercase tracking-tighter mb-2">Sincronizado!</h2>
                <p className="text-slate-400 font-medium">Acessando registro mestre do ativo hospitalar...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center p-12 text-center z-50">
              <div className="max-w-xs">
                <div className="text-6xl mb-6">⚠️</div>
                <p className="text-white text-lg font-bold mb-6 leading-tight">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20"
                >
                  Reiniciar Módulo de Visão
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Scanner Ativo</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Status do Sensor</p>
                <p className="text-sm font-bold text-slate-800">Sensibilidade Máxima Ativa</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">FPS de Captura</p>
                <p className="text-sm font-bold text-slate-800">60 FPS • Sincronismo Local</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-6xl">🛡️</div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 relative z-10">Escaneados Recentemente</h3>
            <div className="space-y-3 relative z-10">
              {recentScans.length === 0 ? (
                <p className="text-slate-500 text-xs italic">Nenhum ativo escaneado nesta sessão.</p>
              ) : (
                recentScans.map(asset => (
                  <div key={asset.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-xs">🏥</div>
                    <div>
                      <p className="text-xs font-bold truncate max-w-[140px]">{asset.name}</p>
                      <p className="text-[9px] text-slate-500 font-mono">{asset.id}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {scannedAsset && (
        <AssetModal 
          asset={scannedAsset} 
          onClose={() => { 
            setScannedAsset(null); 
            setScanning(true);
            setAssets(getStoredAssets());
          }}
          onAction={(id, action) => {
             console.log(`Action ${action} executed for ${id}`);
          }}
        />
      )}
    </div>
  );
};

export default Scanner;
