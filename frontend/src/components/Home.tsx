import { useState, useEffect } from 'react';
import { Utensils, Dumbbell, Dna, Activity as ActivityIcon, ChevronRight, Sparkles, Zap } from 'lucide-react';
import { getLastPlan, fetchActivities } from '../api';
import type { Activity } from '../types';
import { marked } from 'marked';

interface HomeProps {
    onNavigate: (view: 'home' | 'pantry' | 'activities' | 'ai' | 'profile' | 'about') => void;
}

export function Home({ onNavigate }: HomeProps) {
    const [dietPlan, setDietPlan] = useState<string | null>(null);
    const [workoutPlan, setWorkoutPlan] = useState<string | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);

    useEffect(() => {
        getLastPlan('diet').then(res => setDietPlan(res.plan)).catch(() => { });
        getLastPlan('workout').then(res => setWorkoutPlan(res.plan)).catch(() => { });
        fetchActivities(3).then(setActivities).catch(() => { });
    }, []);

    const parseMarkdown = (mdStr: string) => {
        return { __html: marked.parse(mdStr) as string };
    };

    return (
        <div className="relative animate-fade-in-up pb-20 w-full min-h-[70vh]">

            <div className="text-center mb-20 pt-10 relative z-10 w-full">
                <div className="relative w-24 h-24 mx-auto rounded-[2rem] bg-gradient-to-br from-[rgba(229,211,179,0.05)] to-transparent border border-soma-gold/20 flex items-center justify-center mb-8 backdrop-blur-md shadow-[0_4px_40px_rgba(212,175,55,0.15)] group hover:border-soma-gold/40 transition-all duration-500 cursor-default">
                    <Dna size={46} className="text-soma-gold opacity-90 drop-shadow-md group-hover:scale-105 transition-transform duration-500" strokeWidth={1.2} />
                </div>
                <h1 className="text-6xl md:text-7xl font-black tracking-tight text-soma-sand drop-shadow-sm mb-6 normal-case">Soma<span className="text-soma-gold drop-shadow-[0_0_15px_rgba(255,215,0,0.3)]">Sense</span></h1>
                <p className="text-[rgba(229,211,179,0.6)] font-light text-lg md:text-xl max-w-lg mx-auto leading-relaxed italic">
                    Integrating physical performance, nutrition logic, and neural intelligence.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 w-full max-w-7xl mx-auto px-4">
                {/* Fuel Protocol */}
                <div className="glass-card rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden h-[600px] border border-[rgba(229,211,179,0.05)] group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-soma-terracotta opacity-20"></div>
                    <div className="flex items-center gap-4 mb-8 shrink-0 relative z-10">
                        <div className="p-3.5 rounded-2xl bg-soma-terracotta/5 border border-soma-terracotta/20 text-soma-terracotta shadow-inner">
                            <Utensils size={22} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-soma-sand tracking-wide uppercase text-sm">Nutrition Logic</h3>
                            <p className="text-[9px] text-soma-terracotta font-black uppercase tracking-widest mt-0.5 opacity-60">Last Generated Protocol</p>
                        </div>
                    </div>
                    {dietPlan ? (
                        <div className="overflow-y-auto no-scrollbar flex-1 relative z-10 -mx-2 px-2 prose prose-invert prose-ai prose-sm h-full opacity-90" dangerouslySetInnerHTML={parseMarkdown(dietPlan)} />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 relative z-10">
                            <Sparkles className="mb-4 text-soma-terracotta" size={42} strokeWidth={1} />
                            <p className="text-xs font-bold text-soma-sand uppercase tracking-widest max-w-[200px]">No active data. Initialize Soma AI to evaluate resources.</p>
                            <button onClick={() => onNavigate('ai')} className="mt-8 bg-soma-terracotta/10 hover:bg-soma-terracotta/20 border border-soma-terracotta/30 text-soma-terracotta px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">Initialize</button>
                        </div>
                    )}
                </div>

                {/* Training Program */}
                <div className="glass-card rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden h-[600px] border border-soma-gold/10 lg:scale-[1.05] shadow-[0_20px_80px_rgba(0,0,0,0.4)] lg:-mt-2 z-20">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-soma-terracotta via-soma-gold to-soma-terracotta opacity-40"></div>
                    <div className="flex items-center gap-4 mb-8 shrink-0 relative z-10">
                        <div className="p-3.5 rounded-2xl bg-soma-gold/5 border border-soma-gold/20 text-soma-gold shadow-inner">
                            <Dumbbell size={22} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-soma-sand tracking-wide uppercase text-sm">Physical Program</h3>
                            <p className="text-[9px] text-soma-gold font-black uppercase tracking-widest mt-0.5 opacity-60">Last Generated Routine</p>
                        </div>
                    </div>
                    {workoutPlan ? (
                        <div className="overflow-y-auto no-scrollbar flex-1 relative z-10 -mx-2 px-2 prose prose-invert prose-ai prose-sm h-full" dangerouslySetInnerHTML={parseMarkdown(workoutPlan)} />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 relative z-10">
                            <Zap className="mb-4 text-soma-gold" size={42} strokeWidth={1} />
                            <p className="text-xs font-bold text-soma-sand uppercase tracking-widest max-w-[200px]">No active routine. Assign a performance goal to begin.</p>
                            <button onClick={() => onNavigate('ai')} className="mt-8 bg-soma-gold text-[#1E1A17] hover:bg-soma-sand transition-all px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(212,175,55,0.2)]">Design Mode</button>
                        </div>
                    )}
                </div>

                {/* Recent Logs */}
                <div className="glass-card rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden h-[600px] border border-[rgba(229,211,179,0.05)]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-soma-sand opacity-10"></div>
                    <div className="flex items-center gap-4 mb-8 shrink-0 relative z-10">
                        <div className="p-3.5 rounded-2xl bg-soma-sand/5 border border-soma-sand/20 text-soma-sand shadow-inner">
                            <ActivityIcon size={22} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-soma-sand tracking-wide uppercase text-sm">Biometric Events</h3>
                            <p className="text-[9px] text-soma-sand font-black uppercase tracking-widest mt-0.5 opacity-40">Recent Physical Activity</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-5 relative z-10">
                        {activities.length > 0 ? activities.map(act => (
                            <div key={act.id} className="bg-black/30 rounded-[1.5rem] p-5 border border-white/5 backdrop-blur-sm group hover:border-soma-terracotta/20 transition-all duration-500">
                                <h4 className="text-sm text-soma-sand font-bold tracking-wide mb-3 flex items-center justify-between">
                                    {act.activity_type}
                                    <span className="text-[8px] text-soma-terracotta font-black uppercase tracking-widest opacity-60 bg-soma-terracotta/5 px-2 py-1 rounded-md">{act.date}</span>
                                </h4>
                                <div className="flex gap-5">
                                    <span className="text-[11px] text-soma-sand/50 font-bold uppercase tracking-widest"><strong className="text-soma-sand text-sm font-black mr-1">{act.calories_burned}</strong> kcal</span>
                                    <span className="text-[11px] text-soma-sand/50 font-bold uppercase tracking-widest"><strong className="text-soma-sand text-sm font-black mr-1">{act.duration_minutes}</strong> min</span>
                                </div>
                            </div>
                        )) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                <ActivityIcon className="mb-4 text-soma-sand" size={42} strokeWidth={1} />
                                <p className="text-xs font-bold text-soma-sand uppercase tracking-widest max-w-[200px]">No physical activity logs found in registry.</p>
                            </div>
                        )}
                    </div>

                    <button onClick={() => onNavigate('activities')} className="w-full mt-8 bg-white/5 hover:bg-white/10 border border-white/5 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] text-soma-sand flex items-center justify-center gap-3 transition-all relative z-10 shrink-0 shadow-inner">
                        Log Physical Event <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    )
}
