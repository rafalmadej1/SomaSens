import { useState, useEffect } from 'react';
import { User, Target, Activity, Utensils, Ruler, Weight, Calendar, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { getProfile, updateProfile } from '../api';
import type { UserProfile } from '../types';

export function Profile() {
    const [profile, setProfile] = useState<UserProfile>({
        age: 25,
        weight: 75,
        height: 180,
        gender: 'male',
        goal: 'Maintenance',
        activity_level: 'Moderate',
        dietary_preferences: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getProfile();
                setProfile(data);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const savedProfile = await updateProfile(profile);
            setProfile(savedProfile);
            setMessage('Biometrics updated in guidance system.');
            setTimeout(() => setMessage(''), 3000);
        } catch {
            setMessage('Error committing changes.');
            setTimeout(() => setMessage(''), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-soma-sand">
                <Loader2 className="animate-spin mb-4 text-soma-gold" size={32} />
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-50">Calibrating Biometrics...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10 animate-fade-in-up pb-32 px-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pl-2">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black mb-3 tracking-tight text-soma-sand uppercase">User Profile</h2>
                    <p className="text-soma-gold font-medium tracking-widest uppercase text-xs opacity-70">Biometric Configuration</p>
                </div>
                {message && (
                    <div className="bg-soma-gold/10 border border-soma-gold/20 text-soma-gold px-6 py-3 rounded-2xl flex items-center gap-3 animate-fade-in-up shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                        <CheckCircle2 size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{message}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Biometric Data */}
                <div className="xl:col-span-8 space-y-8">
                    <div className="glass-card rounded-[3rem] p-8 md:p-12 border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-soma-gold/20 to-transparent"></div>
                        
                        <div className="flex items-center gap-4 mb-12">
                            <div className="p-3 rounded-2xl bg-soma-gold/5 border border-soma-gold/20 text-soma-gold shadow-inner">
                                <User size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-soma-sand tracking-tight uppercase text-sm">Biometric Data</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em] group-focus-within:text-soma-gold transition-colors">
                                        <Calendar size={12} /> Age
                                    </label>
                                    <input 
                                        type="number" 
                                        value={profile.age || ''} 
                                        onChange={e => setProfile({...profile, age: parseInt(e.target.value)})}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 text-soma-sand focus:border-soma-gold/50 transition-all outline-none font-medium text-lg" 
                                    />
                                </div>
                                <div className="group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em] group-focus-within:text-soma-gold transition-colors">
                                        <Weight size={12} /> Body Mass (kg)
                                    </label>
                                    <input 
                                        type="number" step="0.1" 
                                        value={profile.weight || ''} 
                                        onChange={e => setProfile({...profile, weight: parseFloat(e.target.value)})}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 text-soma-sand focus:border-soma-gold/50 transition-all outline-none font-medium text-lg" 
                                    />
                                </div>
                                <div className="group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em] group-focus-within:text-soma-gold transition-colors">
                                        <Ruler size={12} /> Stature (cm)
                                    </label>
                                    <input 
                                        type="number" 
                                        value={profile.height || ''} 
                                        onChange={e => setProfile({...profile, height: parseInt(e.target.value)})}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 text-soma-sand focus:border-soma-gold/50 transition-all outline-none font-medium text-lg" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em]">
                                        <Activity size={12} /> Physical Output
                                    </label>
                                    <select 
                                        value={profile.activity_level || ''} 
                                        onChange={e => setProfile({...profile, activity_level: e.target.value})}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 text-soma-sand focus:border-soma-gold/50 transition-all outline-none font-medium text-lg cursor-pointer appearance-none"
                                    >
                                        <option value="Sedentary">Sedentary (0 active cycles)</option>
                                        <option value="Light">Light (1-2 cycles/week)</option>
                                        <option value="Moderate">Moderate (3-4 cycles/week)</option>
                                        <option value="High">High (5+ cycles/week)</option>
                                        <option value="Athlete">Elite (Daily output)</option>
                                    </select>
                                </div>
                                <div className="group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em]">
                                        <Target size={12} /> Primary Goal
                                    </label>
                                    <input 
                                        value={profile.goal || ''} 
                                        onChange={e => setProfile({...profile, goal: e.target.value})}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 text-soma-sand focus:border-soma-gold/50 transition-all outline-none font-medium text-lg" 
                                        placeholder="e.g. Hypertrophy"
                                    />
                                </div>
                                <div className="group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em]">
                                        <User size={12} /> Biological Sex
                                    </label>
                                    <div className="flex gap-4">
                                        {['male', 'female', 'other'].map(g => (
                                            <button 
                                                key={g}
                                                onClick={() => setProfile({...profile, gender: g})}
                                                className={`flex-1 py-4 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${profile.gender === g ? 'bg-soma-gold/10 border-soma-gold/30 text-soma-gold' : 'bg-black/20 border-white/5 text-soma-sand/30 hover:border-white/10'}`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Nutrition Preferences */}
                <div className="xl:col-span-4 space-y-8">
                    <div className="glass-card rounded-[3rem] p-8 md:p-10 border border-white/5 h-full flex flex-col">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 rounded-2xl bg-soma-terracotta/5 border border-soma-terracotta/20 text-soma-terracotta shadow-inner">
                                <Utensils size={22} />
                            </div>
                            <h3 className="text-xl font-bold text-soma-sand tracking-tight uppercase text-sm">Nutrition Logic</h3>
                        </div>

                        <div className="flex-1">
                            <label className="block text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em]">Dietary Constraints</label>
                            <textarea 
                                value={profile.dietary_preferences || ''} 
                                onChange={e => setProfile({...profile, dietary_preferences: e.target.value})}
                                className="w-full h-48 bg-black/40 border border-white/5 rounded-3xl px-6 py-5 text-soma-sand focus:border-soma-terracotta/50 transition-all outline-none font-medium resize-none text-base"
                                placeholder="e.g. High protein, plant-based focus, avoid lactose..."
                            />
                        </div>

                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full mt-10 bg-soma-gold text-[#1E1A17] font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all hover:bg-soma-sand shadow-[0_10px_40px_rgba(212,175,55,0.15)] flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <><Save size={20}/> Commit Changes</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
