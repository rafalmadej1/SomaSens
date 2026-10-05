import React, { useState } from 'react';
import { Mail, Lock, UserPlus, AlertCircle, Fingerprint, Dna } from 'lucide-react';
import { loginUser, registerUser } from '../api';

interface AuthProps {
  onLogin: () => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await loginUser(email, password);
      } else {
        await registerUser(email, password);
      }
      onLogin();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Access denied.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#1E1A17] font-sans selection:bg-soma-gold/30">

      {/* Environment background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-soma-terracotta/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse-glow"></div>
        <div className="absolute bottom-[0%] left-[-10%] w-[500px] h-[500px] bg-soma-gold/10 rounded-full mix-blend-screen filter blur-[150px] animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="glass-card bg-[rgba(20,18,15,0.7)] backdrop-blur-3xl border border-[rgba(229,211,179,0.1)] p-8 md:p-14 rounded-[3rem] w-full max-w-[440px] relative z-10 animate-fade-in-up shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden">

        {/* Edge glow */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-soma-gold/40 to-transparent"></div>

        <div className="text-center mb-12">
          {/* Logo element */}
          <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-[rgba(229,211,179,0.05)] to-transparent border border-soma-gold/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(212,175,55,0.15)] relative group cursor-default">
            <div className="absolute inset-0 bg-soma-gold/10 rounded-[1.5rem] p-10 animate-ping opacity-20"></div>
            <Dna size={38} className="text-soma-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.6)] group-hover:rotate-180 transition-transform duration-[1500ms]" strokeWidth={1} />
          </div>

          <h1 className="text-4xl font-black text-soma-sand tracking-tighter mb-2 flex items-center justify-center">
            Soma<span className="text-soma-gold drop-shadow-[0_0_15px_rgba(255,215,0,0.3)]">Sense</span>
          </h1>
          <p className="text-soma-sand/50 text-[10px] font-black tracking-[0.3em] uppercase">
            Your Form Crafter
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-soma-sand/30 group-focus-within:text-soma-gold transition-colors" size={20} />
            <input
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-[rgba(229,211,179,0.1)] rounded-2xl pl-16 pr-6 py-5 text-soma-sand focus:border-soma-gold/50 focus:shadow-[0_0_20px_rgba(212,175,55,0.1)] transition-all outline-none font-medium placeholder-soma-sand/20 shadow-inner"
              placeholder="System ID (Email)"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-soma-sand/30 group-focus-within:text-soma-gold transition-colors" size={20} />
            <input
              required
              type="password"
              minLength={8}
              maxLength={72}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-[rgba(229,211,179,0.1)] rounded-2xl pl-16 pr-6 py-5 text-soma-sand focus:border-soma-gold/50 focus:shadow-[0_0_20px_rgba(212,175,55,0.1)] transition-all outline-none font-medium placeholder-soma-sand/20 shadow-inner"
              placeholder="Passcode"
            />
          </div>

          {error && (
            <div className="bg-[rgba(239,68,68,0.05)] border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold flex items-center gap-3 animate-shake">
              <AlertCircle size={18} className="shrink-0" /> {error}
            </div>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full relative overflow-hidden bg-gradient-to-r from-soma-terracotta to-soma-gold text-[#1E1A17] hover:brightness-110 disabled:opacity-50 font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-[0_10px_40px_rgba(212,175,55,0.25)] hover:shadow-[0_10px_50px_rgba(212,175,55,0.4)] flex items-center justify-center gap-3 mt-8 group"
          >
            {loading ? (
              <span className="flex items-center gap-3 animate-pulse">
                <div className="w-5 h-5 rounded-full border-t-2 border-[#1E1A17] animate-spin"></div>
                Synchronizing...
              </span>
            ) : isLogin ? (
              <><Fingerprint size={22} className="drop-shadow-md group-hover:scale-110 transition-transform" /> Initialize</>
            ) : (
              <><UserPlus size={22} className="drop-shadow-md group-hover:scale-110 transition-transform" /> Register Profile</>
            )}

            {/* Button light reflection */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-t-2xl pointer-events-none"></div>
          </button>
        </form>

        <div className="mt-10 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-soma-sand/40 text-[10px] font-black uppercase tracking-widest hover:text-soma-sand transition-colors relative after:content-[''] after:absolute after:-bottom-1.5 after:left-[10%] after:w-[80%] after:h-[1px] after:bg-soma-sand/0 hover:after:bg-soma-sand/50 after:transition-all after:duration-300"
          >
            {isLogin ? "No System ID? Create profile" : "Already have a profile? Initialize"}
          </button>
        </div>
      </div>
    </div>
  );
}
