import React, { useState, useEffect } from 'react';
import { Activity as ActivityIcon, Flame, Clock, Plus, Trash2, Zap, Loader2 } from 'lucide-react';
import { fetchActivities, addActivity, deleteActivity } from '../api';
import type { Activity } from '../types';

const PAGE_SIZE = 100;

export function Activities() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [type, setType] = useState('');
    const [calories, setCalories] = useState('');
    const [duration, setDuration] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const loadData = async (offset = 0) => {
        if (offset === 0) {
            setLoading(true);
        } else {
            setIsLoadingMore(true);
        }
        try {
            const data = await fetchActivities(PAGE_SIZE, offset);
            setActivities(currentActivities => (
                offset === 0 ? data : [...currentActivities, ...data]
            ));
            setHasMore(data.length === PAGE_SIZE);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setIsLoadingMore(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const activity = await addActivity({
                activity_type: type,
                calories_burned: parseInt(calories),
                duration_minutes: parseInt(duration),
                date
            });
            setType(''); setCalories(''); setDuration('');
            setActivities(currentActivities => [activity, ...currentActivities]);
        } catch (e) {
            console.error(e);
            alert('Failed to sync event.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteActivity(id);
            setActivities(currentActivities => currentActivities.filter(activity => activity.id !== id));
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex flex-col gap-10 animate-fade-in-up pb-32 px-2">
            <div className="flex justify-between items-end pl-2">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black mb-3 tracking-tight text-soma-sand uppercase">Biometric Logs</h2>
                    <p className="text-soma-terracotta font-medium tracking-widest uppercase text-xs opacity-70">Physical Expenditure Tracking</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Entry Form */}
                <div className="lg:col-span-5">
                    <div className="glass-card rounded-[2.5rem] p-8 md:p-10 sticky top-32 border border-[rgba(211,115,82,0.1)]">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="p-3 rounded-2xl bg-soma-terracotta/5 border border-soma-terracotta/20 text-soma-terracotta shadow-inner">
                                <Plus size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-soma-sand tracking-tight uppercase text-sm">Log New Event</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em]">Activity Name</label>
                                <input required value={type} onChange={e => setType(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-soma-sand focus:border-soma-terracotta/50 transition-all outline-none font-medium" placeholder="e.g. Kinetic Strength" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em]">Kcal Burned</label>
                                    <input required type="number" value={calories} onChange={e => setCalories(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-soma-sand focus:border-soma-terracotta/50 transition-all outline-none font-medium" placeholder="350" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em]">Duration (min)</label>
                                    <input required type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-soma-sand focus:border-soma-terracotta/50 transition-all outline-none font-medium" placeholder="45" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em]">Date</label>
                                <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-soma-sand focus:border-soma-terracotta/50 transition-all outline-none [color-scheme:dark] font-medium" />
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="w-full bg-soma-terracotta text-[#1E1A17] font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all hover:bg-soma-sand mt-4 shadow-[0_10px_30px_rgba(211,115,82,0.15)] flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <><Zap size={20}/> Commit Event</>}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Event History */}
                <div className="lg:col-span-7 space-y-6">
                    {loading ? (
                        <div className="py-32 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 rounded-full border-b-2 border-soma-terracotta animate-spin mb-6 opacity-50"></div>
                            <p className="text-soma-terracotta font-bold tracking-[0.3em] text-[10px] uppercase">Retrieving Records...</p>
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="glass-card rounded-[2.5rem] p-20 text-center flex flex-col items-center justify-center border-dashed border-white/5">
                            <ActivityIcon size={48} className="text-soma-sand/10 mb-6" strokeWidth={1} />
                            <p className="text-soma-sand/40 text-xs font-bold uppercase tracking-widest">No biometric events found.</p>
                        </div>
                    ) : (
                        activities.map(act => (
                            <div key={act.id} className="glass-card rounded-[2rem] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-white/5 hover:border-soma-terracotta/20 transition-all duration-500 group">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-soma-terracotta shadow-inner border border-white/5">
                                        <Flame size={24} strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-soma-sand mb-1 tracking-wide">{act.activity_type}</h4>
                                        <div className="flex items-center gap-3 opacity-50">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-soma-sand">{act.date}</span>
                                            <div className="w-1 h-1 rounded-full bg-soma-sand/30"></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-soma-terracotta">Verified Event</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-8">
                                    <div className="flex gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-soma-sand/30 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                <Flame size={10} className="text-soma-terracotta" /> Kcal
                                            </span>
                                            <span className="text-xl font-medium text-soma-sand">{act.calories_burned}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-soma-sand/30 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                <Clock size={10} className="text-soma-sand/50" /> Min
                                            </span>
                                            <span className="text-xl font-medium text-soma-sand">{act.duration_minutes}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(act.id)}
                                        className="p-3 rounded-xl bg-red-500/0 hover:bg-red-500/10 text-red-400/40 hover:text-red-400 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                    {hasMore && (
                        <button
                            onClick={() => loadData(activities.length)}
                            disabled={isLoadingMore}
                            className="w-full py-4 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-soma-sand/60 transition-all hover:border-soma-terracotta/40 hover:text-soma-sand disabled:opacity-50"
                        >
                            {isLoadingMore ? 'Retrieving Records...' : 'Load More'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
