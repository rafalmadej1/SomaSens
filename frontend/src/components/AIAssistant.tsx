import React, { useState, useEffect } from 'react';
import { Sparkles, Dumbbell, Utensils, AlertCircle, Zap, Brain, ShoppingCart, Loader2, Calendar, Wallet, Ban, Heart, ChevronDown, ChevronUp, Activity, ShieldAlert, Crosshair, Package } from 'lucide-react';
import { getDietPlan, getWorkoutPlan, getShoppingList, getLastPlan } from '../api';
import { marked } from 'marked';

export function AIAssistant() {
  const [activeTab, setActiveTab] = useState<'diet' | 'workout' | 'shopping'>('diet');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Results visibility
  const [isResultOpen, setIsResultOpen] = useState(true);

  // Tab results cache
  const [dietResult, setDietResult] = useState<string | null>(null);
  const [workoutResult, setWorkoutResult] = useState<string | null>(null);
  const [shoppingResult, setShoppingResult] = useState<string | null>(null);

  // Shopping parameters
  const [shoppingDays, setShoppingDays] = useState(7);
  const [shoppingBudget, setShoppingBudget] = useState('');
  const [shoppingAvoids, setShoppingAvoids] = useState('');
  const [shoppingPrefs, setShoppingPreferences] = useState('');

  // Workout parameters
  const [workoutDiscipline, setWorkoutDiscipline] = useState('');
  const [workoutInjuries, setWorkoutInjuries] = useState('');
  const [workoutEquipment, setWorkoutEquipment] = useState('Full Gym');
  const [workoutFocus, setWorkoutFocus] = useState('');

  // Last workout program for shopping context
  const [lastWorkoutPlan, setLastWorkoutPlan] = useState<string | null>(null);

  // Load last plans from DB on mount
  useEffect(() => {
    const loadLastPlans = async () => {
      try {
        const [lastDiet, lastWorkout, lastShopping] = await Promise.all([
          getLastPlan('diet'),
          getLastPlan('workout'),
          getLastPlan('shopping')
        ]);

        if (lastDiet.plan) setDietResult(lastDiet.plan);
        if (lastWorkout.plan) {
          setWorkoutResult(lastWorkout.plan);
          setLastWorkoutPlan(lastWorkout.plan);
        }
        if (lastShopping.plan) setShoppingResult(lastShopping.plan);
      } catch (e) {
        console.error("Failed to sync records:", e);
      } finally {
        setInitialLoading(false);
      }
    };
    loadLastPlans();
  }, []);

  const handleDiet = async () => {
    setLoading(true); setError(null);
    try {
      const plan = await getDietPlan();
      setDietResult(plan);
      setIsResultOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Communication error with guidance system.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const plan = await getWorkoutPlan({
        injuries: workoutInjuries || undefined,
        discipline: workoutDiscipline || undefined,
        equipment: workoutEquipment,
        focus_areas: workoutFocus || undefined
      });
      setWorkoutResult(plan);
      setLastWorkoutPlan(plan);
      setIsResultOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Communication error with guidance system.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleShopping = async () => {
    setLoading(true); setError(null);
    try {
      const plan = await getShoppingList(
        lastWorkoutPlan || undefined,
        shoppingDays,
        shoppingBudget ? parseFloat(shoppingBudget) : undefined,
        shoppingAvoids || undefined,
        shoppingPrefs || undefined
      );
      setShoppingResult(plan);
      setIsResultOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Communication error with guidance system.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const parseMarkdown = (mdStr: string) => {
    return { __html: marked.parse(mdStr) as string };
  };

  const getCurrentResult = () => {
    if (activeTab === 'diet') return dietResult;
    if (activeTab === 'workout') return workoutResult;
    if (activeTab === 'shopping') return shoppingResult;
    return null;
  };

  const getResultLabel = () => {
    if (activeTab === 'diet') return "Active Nutrition Protocol";
    if (activeTab === 'workout') return "Active Physical Program";
    if (activeTab === 'shopping') return "Active Supply Sync";
    return "Generated Content";
  };

  if (initialLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-soma-sand">
        <Loader2 className="animate-spin mb-4 text-soma-gold" size={32} />
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-50">Calibrating Guidance Link...</p>
      </div>
    );
  }

  const currentResult = getCurrentResult();

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up pb-32">
      <div className="flex justify-between items-end pl-2">
        <div>
          <h2 className="text-4xl md:text-5xl font-black mb-3 tracking-tight text-white drop-shadow-lg flex items-center normal-case gap-3">
            <Brain className="group text-soma-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]" size={42} />
            <span>
              Soma<span className="text-soma-gold drop-shadow-[0_0_15px_rgba(255,215,0,0.3)]">AI</span>
            </span>
          </h2>
          <p className="text-soma-gold font-medium tracking-widest uppercase text-sm">Guidance System</p>
        </div>
      </div>

      <div className="flex p-2 rounded-[2rem] glass-card self-start shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-x-auto max-w-full no-scrollbar">
        <button
          onClick={() => { setActiveTab('diet'); setError(null); }}
          className={`px-8 py-4 rounded-[1.5rem] text-sm font-bold flex items-center gap-3 transition-all duration-300 uppercase tracking-widest shrink-0 ${activeTab === 'diet' ? 'bg-soma-sand text-[#1E1A17] shadow-[0_0_20px_rgba(229,211,179,0.3)]' : 'text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}`}
        >
          <Utensils size={18} /> Nutrition
        </button>
        <button
          onClick={() => { setActiveTab('workout'); setError(null); }}
          className={`px-8 py-4 rounded-[1.5rem] text-sm font-bold flex items-center gap-3 transition-all duration-300 uppercase tracking-widest shrink-0 ${activeTab === 'workout' ? 'bg-soma-sand text-[#1E1A17] shadow-[0_0_20px_rgba(229,211,179,0.3)]' : 'text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}`}
        >
          <Dumbbell size={18} /> Workout
        </button>
        <button
          onClick={() => { setActiveTab('shopping'); setError(null); }}
          className={`px-8 py-4 rounded-[1.5rem] text-sm font-bold flex items-center gap-3 transition-all duration-300 uppercase tracking-widest shrink-0 ${activeTab === 'shopping' ? 'bg-soma-sand text-[#1E1A17] shadow-[0_0_20px_rgba(229,211,179,0.3)]' : 'text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}`}
        >
          <ShoppingCart size={18} /> Supplies
        </button>
      </div>

      <div className="glass-card border-[rgba(255,255,255,0.1)] p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden backdrop-blur-2xl">
        <div className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-[2000ms] ${activeTab === 'diet' ? 'bg-soma-terracotta' : activeTab === 'workout' ? 'bg-soma-gold' : 'bg-emerald-500'}`}></div>

        <div className="flex items-center gap-6 mb-10 relative z-10">
          <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg ${activeTab === 'diet' ? 'bg-gradient-to-br from-soma-terracotta to-orange-800 shadow-[0_0_30px_rgba(211,115,82,0.4)]' :
            activeTab === 'workout' ? 'bg-gradient-to-br from-soma-gold to-yellow-800 shadow-[0_0_30px_rgba(212,175,55,0.4)]' :
              'bg-gradient-to-br from-emerald-400 to-teal-600 shadow-[0_0_30px_rgba(52,211,153,0.4)]'
            }`}>
            <Sparkles size={32} />
          </div>
          <div>
            <h2 className={`text-2xl font-black ${activeTab === 'diet' ? 'text-soma-terracotta' :
              activeTab === 'workout' ? 'text-soma-gold' :
                'text-emerald-400'
              } tracking-wide mb-1`}>
              {activeTab === 'diet' ? 'Nutrition Optimization' : activeTab === 'workout' ? 'Peak Program' : 'Supply Sync'}
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              {activeTab === 'diet' ? 'Resource evaluation and meal crafting' :
                activeTab === 'workout' ? 'Algorithmic physical training design' :
                  'Predictive supply management and acquisition'}
            </p>
          </div>
        </div>

        <div className="relative z-10">
          {activeTab === 'diet' && (
            <div className="mb-2">
              <p className="text-slate-300 mb-8 text-lg font-light leading-relaxed italic">The AI guide will analyze your current <strong className="text-soma-sand font-bold">Inventory</strong>, considering your recent biometric logs and profile data to generate precise nutritional protocols.</p>
              <button
                onClick={handleDiet}
                disabled={loading}
                className="w-full md:w-auto px-10 py-5 bg-soma-terracotta hover:opacity-90 disabled:opacity-50 text-[#1E1A17] font-black rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(211,115,82,0.3)] hover:shadow-[0_0_40_rgba(211,115,82,0.6)] tracking-widest uppercase"
              >
                {loading ? <span className="animate-pulse flex items-center gap-3"><Zap size={20} className="animate-pulse-glow" /> Initializing Core...</span> : <>Initialize Crafting <Zap size={20} /></>}
              </button>
            </div>
          )}

          {activeTab === 'workout' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="flex items-center gap-2 text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em] group-focus-within:text-soma-gold transition-colors">
                    <Activity size={12} /> Primary Discipline
                  </label>
                  <input
                    placeholder="e.g. Crossfit, Running, MMA"
                    value={workoutDiscipline}
                    onChange={e => setWorkoutDiscipline(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-soma-sand focus:border-soma-gold/50 transition-all outline-none font-medium"
                  />
                </div>
                <div className="group">
                  <label className="flex items-center gap-2 text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em] group-focus-within:text-soma-gold transition-colors">
                    <Package size={12} /> Equipment Access
                  </label>
                  <select
                    value={workoutEquipment}
                    onChange={e => setWorkoutEquipment(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-soma-sand focus:border-soma-gold/50 transition-all outline-none font-medium appearance-none cursor-pointer"
                  >
                    <option value="Full Gym">Commercial Gym (Full Equipment)</option>
                    <option value="Home Gym">Basic Home Gym (Dumbbells/Barbell)</option>
                    <option value="Bodyweight">Bodyweight Only / No Equipment</option>
                    <option value="Minimal">Minimal (Kettlebell/Bands)</option>
                  </select>
                </div>
                <div className="group md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em] group-focus-within:text-soma-gold transition-colors">
                    <ShieldAlert size={12} /> Injury History / Limitations
                  </label>
                  <input
                    placeholder="e.g. Lower back pain, Weak knees, Rotator cuff"
                    value={workoutInjuries}
                    onChange={e => setWorkoutInjuries(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-soma-sand focus:border-soma-gold/50 transition-all outline-none font-medium"
                  />
                </div>
                <div className="group md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em] group-focus-within:text-soma-gold transition-colors">
                    <Crosshair size={12} /> Anatomical Focus Areas
                  </label>
                  <input
                    placeholder="e.g. Posture correction, Core stability, Explosiveness"
                    value={workoutFocus}
                    onChange={e => setWorkoutFocus(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-soma-sand focus:border-soma-gold/50 transition-all outline-none font-medium"
                  />
                </div>
              </div>

              <button
                onClick={handleWorkout}
                disabled={loading}
                className="w-full md:w-auto px-10 py-5 bg-soma-gold hover:opacity-90 disabled:opacity-50 text-[#1E1A17] font-black rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_40px_rgba(212,175,55,0.6)] tracking-widest uppercase"
              >
                {loading ? <span className="animate-pulse flex items-center gap-3"><Zap size={20} className="animate-pulse-glow" /> Design Mode Active...</span> : <>Generate Program <Zap size={20} /></>}
              </button>
            </div>
          )}

          {activeTab === 'shopping' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="flex items-center gap-2 text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em] group-focus-within:text-emerald-400 transition-colors">
                    <Calendar size={12} /> Duration (Days)
                  </label>
                  <input
                    type="number" min="1" max="30"
                    value={shoppingDays}
                    onChange={e => setShoppingDays(parseInt(e.target.value))}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-soma-sand focus:border-emerald-500/50 transition-all outline-none font-medium"
                  />
                </div>
                <div className="group">
                  <label className="flex items-center gap-2 text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em] group-focus-within:text-emerald-400 transition-colors">
                    <Wallet size={12} /> Budget (PLN)
                  </label>
                  <input
                    type="number" step="0.01" placeholder="e.g. 300"
                    value={shoppingBudget}
                    onChange={e => setShoppingBudget(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-soma-sand focus:border-emerald-500/50 transition-all outline-none font-medium"
                  />
                </div>
                <div className="group md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em] group-focus-within:text-emerald-400 transition-colors">
                    <Ban size={12} /> Avoid / Allergies
                  </label>
                  <input
                    placeholder="e.g. Peanuts, Dairy, Cilantro"
                    value={shoppingAvoids}
                    onChange={e => setShoppingAvoids(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-soma-sand focus:border-emerald-500/50 transition-all outline-none font-medium"
                  />
                </div>
                <div className="group md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em] group-focus-within:text-emerald-400 transition-colors">
                    <Heart size={12} /> Dietary Preferences
                  </label>
                  <input
                    placeholder="e.g. High protein, Vegan, Low-carb"
                    value={shoppingPrefs}
                    onChange={e => setShoppingPreferences(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-soma-sand focus:border-emerald-500/50 transition-all outline-none font-medium"
                  />
                </div>
              </div>

              {lastWorkoutPlan && (
                <div className="p-4 rounded-2xl bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.2)]">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <Zap size={14} /> Active Program Detected
                  </p>
                  <p className="text-slate-400 text-[10px] leading-tight">Your supply sync will be optimized based on the latest plan.</p>
                </div>
              )}

              <button
                onClick={handleShopping}
                disabled={loading}
                className="w-full md:w-auto px-10 py-5 bg-emerald-500 hover:opacity-90 disabled:opacity-50 text-[#1E1A17] font-black rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] tracking-widest uppercase"
              >
                {loading ? <span className="animate-pulse flex items-center gap-3"><Zap size={20} className="animate-pulse-glow" /> Scanning Sectors...</span> : <>Generate Supplies <ShoppingCart size={20} /></>}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-8 bg-[rgba(239,68,68,0.1)] border border-red-500/30 text-red-400 p-6 rounded-[1.5rem] flex items-center gap-4 animate-fade-in-up">
              <AlertCircle size={28} className="shrink-0" />
              <p className="text-sm font-bold tracking-wide">{error}</p>
            </div>
          )}

          {currentResult && (
            <div className="mt-12 flex flex-col gap-4">
              {/* Collapsible Result Panel */}
              <button
                onClick={() => setIsResultOpen(!isResultOpen)}
                className={`flex items-center justify-between w-full px-8 py-6 rounded-[2rem] glass-card border border-white/10 hover:bg-white/5 transition-all group ${isResultOpen ? 'rounded-b-none border-b-transparent' : ''
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 ${activeTab === 'diet' ? 'text-soma-terracotta' :
                    activeTab === 'workout' ? 'text-soma-gold' :
                      'text-emerald-400'
                    }`}>
                    <Zap size={18} />
                  </div>
                  <span className="text-sm font-black uppercase tracking-[0.2em] text-soma-sand/90">
                    {getResultLabel()}
                  </span>
                </div>
                {isResultOpen ? <ChevronUp size={20} className="text-soma-sand/30" /> : <ChevronDown size={20} className="text-soma-sand/30" />}
              </button>

              {isResultOpen && (
                <div className={`glass-panel p-8 md:p-12 rounded-b-[2rem] rounded-t-none border-t-0 animate-fade-in-up shadow-[0_30px_100px_rgba(0,0,0,0.5)] relative ${activeTab === 'diet' ? 'border-soma-terracotta/20' :
                  activeTab === 'workout' ? 'border-soma-gold/20' :
                    'border-emerald-500/20'
                  }`}>
                  <div
                    className="prose prose-invert prose-ai max-w-none relative z-10"
                    dangerouslySetInnerHTML={parseMarkdown(currentResult)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
