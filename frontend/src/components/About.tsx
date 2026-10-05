import { Info, Dna, ShieldCheck, Zap, Globe, Cpu } from 'lucide-react';

export function About() {
  return (
    <div className="flex flex-col gap-12 animate-fade-in-up pb-32 px-2 max-w-5xl mx-auto">
      <div className="flex justify-between items-end pl-2">
        <div>
          <h2 className="text-4xl md:text-5xl font-black mb-3 tracking-tight text-soma-sand uppercase">SomaSense System</h2>
          <p className="text-soma-gold font-medium tracking-widest uppercase text-xs opacity-70">Neural Guidance Ecosystem v2.6</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card rounded-[3rem] p-10 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-soma-gold opacity-20"></div>
          <Dna className="text-soma-gold mb-8 opacity-80" size={42} strokeWidth={1.5} />
          <h3 className="text-xl font-bold text-soma-sand mb-4 uppercase tracking-tight">The Vision</h3>
          <p className="text-soma-sand/60 leading-relaxed font-light italic">
            SomaSense is a digital framework for the human biological vessel. 
            By merging biometric logs with real-time inventory tracking, we create a closed-loop system 
            for physical optimization.
          </p>
        </div>

        <div className="glass-card rounded-[3rem] p-10 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-soma-terracotta opacity-20"></div>
          <ShieldCheck className="text-soma-terracotta mb-8 opacity-80" size={42} strokeWidth={1.5} />
          <h3 className="text-xl font-bold text-soma-sand mb-4 uppercase tracking-tight">Data Integrity</h3>
          <p className="text-soma-sand/60 leading-relaxed font-light italic">
            Your biological logs remain within the SomaSense encrypted vault. 
            We utilize a locally hosted Gemma 4 model for neural processing while maintaining
            strict user isolation and local-first data principles.
          </p>
        </div>
      </div>

      <div className="glass-card rounded-[3rem] p-10 md:p-12 border border-white/5 relative overflow-hidden">
        <h3 className="text-xs font-black text-soma-sand/30 uppercase tracking-[0.3em] mb-10">Technical Specifications</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-soma-gold flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <Zap size={12} /> Neural Core
            </span>
            <span className="text-soma-sand font-medium">Local Gemma 4</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-soma-gold flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <Globe size={12} /> Security
            </span>
            <span className="text-soma-sand font-medium">JWT Vault</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-soma-gold flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <Cpu size={12} /> Environment
            </span>
            <span className="text-soma-sand font-medium">React 19 Framework</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-soma-gold flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <Info size={12} /> Registry
            </span>
            <span className="text-soma-sand font-medium text-emerald-500/80 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              Active
            </span>
          </div>
        </div>
      </div>

      <div className="text-center pt-10">
        <p className="text-[10px] font-black text-soma-sand/20 uppercase tracking-[0.5em]">
          Designed for the 2026 High-Performance Human
        </p>
      </div>
    </div>
  );
}
