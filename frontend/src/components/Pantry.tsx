import React, { useState, useEffect, useMemo } from 'react';
import { Scale, Calendar, Trash2, Plus, X, PackageOpen, Search, ArrowUpDown, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import type { PantryItem } from '../types';
import { fetchPantryItems, addPantryItem, deletePantryItem } from '../api';

const PAGE_SIZE = 100;

export function Pantry() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    lodowka: true,
    spizarnia: true,
    zamrazarka: true
  });

  // Filter and Sort states
  const [filterText, setFilterText] = useState('');
  const [sortField, setSortField] = useState<keyof PantryItem>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Form states
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'g' | 'szt'>('g');
  const [location, setLocation] = useState('lodowka');
  const [expDate, setExpDate] = useState('');

  const loadItems = async (offset = 0) => {
    if (offset === 0) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    try {
      const data = await fetchPantryItems(PAGE_SIZE, offset);
      setItems(currentItems => (
        offset === 0 ? data : [...currentItems, ...data]
      ));
      setHasMore(data.length === PAGE_SIZE);
      setLastUpdated(new Date().toLocaleString('en-GB', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const sortedAndFilteredItems = useMemo(() => {
    let result = [...items];
    if (filterText) {
      result = result.filter(i => i.name.toLowerCase().includes(filterText.toLowerCase()));
    }
    result.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
    return result;
  }, [items, filterText, sortField, sortOrder]);

  const groupedItems = useMemo(() => {
    return {
      lodowka: sortedAndFilteredItems.filter(i => i.location === 'lodowka'),
      spizarnia: sortedAndFilteredItems.filter(i => i.location === 'spizarnia'),
      zamrazarka: sortedAndFilteredItems.filter(i => i.location === 'zamrazarka'),
    };
  }, [sortedAndFilteredItems]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePantryItem(id);
      setItems(currentItems => currentItems.filter(item => item.id !== id));
    } catch (e) {
      console.error(e);
      alert('Failed to remove item.');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const item = await addPantryItem({
        name,
        quantity: parseInt(quantity, 10),
        unit,
        location,
        expirationDate: expDate
      });
      setIsModalOpen(false);
      setName('');
      setQuantity('');
      setExpDate('');
      setItems(currentItems => [item, ...currentItems]);
    } catch (e) {
      console.error(e);
      alert('Failed to record resource.');
    }
  };

  const toggleSort = (field: keyof PantryItem) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSection = (id: string, title: string, icon: string, color: string, itemsList: PantryItem[]) => {
    const isOpen = openSections[id];
    if (itemsList.length === 0 && filterText) return null;
    
    return (
      <div className="flex flex-col mb-6">
        <button 
          onClick={() => toggleSection(id)}
          className="flex items-center gap-4 px-4 py-5 glass-card rounded-[1.5rem] border-white/5 hover:bg-white/5 transition-all group"
        >
          <div className={`w-10 h-10 rounded-xl bg-black/20 border border-white/5 flex items-center justify-center text-xl shadow-inner`}>
            {icon}
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-soma-sand/80">{title}</h3>
            <p className={`text-[9px] font-black uppercase tracking-widest ${color} opacity-60`}>{itemsList.length} Units Active</p>
          </div>
          {isOpen ? <ChevronDown className="text-soma-sand/30 group-hover:text-soma-gold" size={20} /> : <ChevronRight className="text-soma-sand/30 group-hover:text-soma-gold" size={20} />}
        </button>

        {isOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6 animate-fade-in-up">
            {itemsList.length === 0 ? (
              <div className="col-span-full py-10 px-8 rounded-[2rem] border border-dashed border-white/5 flex items-center justify-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-soma-sand/20 italic">No resources allocated to this sector.</p>
              </div>
            ) : (
              itemsList.map((item) => (
                <div key={item.id} className="glass-card rounded-[2.5rem] p-7 relative overflow-hidden group border border-[rgba(229,211,179,0.05)] hover:border-soma-gold/20 transition-all duration-500">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-soma-gold rounded-full blur-[60px] opacity-[0.03] group-hover:opacity-10 transition-all duration-700"></div>
                  
                  <div className="flex justify-between items-start mb-8 relative z-10">
                     <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-xl bg-[rgba(229,211,179,0.03)] border border-[rgba(229,211,179,0.08)] flex items-center justify-center text-xl shadow-inner backdrop-blur-md">
                          {icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-soma-sand tracking-wide mb-1">{item.name}</h3>
                          <span className="text-[9px] font-black text-soma-terracotta uppercase tracking-[0.15em] opacity-60">Verified Resource</span>
                        </div>
                     </div>
                     <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-3 rounded-xl bg-red-500/5 hover:bg-red-500/15 text-red-400/60 hover:text-red-400 transition-all active:scale-95 duration-300 border border-transparent hover:border-red-500/20"
                     >
                       <Trash2 size={14} />
                     </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="bg-[rgba(30,26,23,0.3)] rounded-2xl p-4 flex flex-col gap-1 border border-[rgba(229,211,179,0.03)] backdrop-blur-sm">
                       <span className="flex items-center gap-2 text-[9px] text-soma-sand/40 uppercase font-bold tracking-widest mb-1">
                         <Scale size={12} className="text-soma-gold/50"/> Magnitude
                       </span>
                       <span className="text-lg font-medium text-soma-sand">{item.quantity}<span className="text-xs ml-1 opacity-40 font-light">{item.unit}</span></span>
                    </div>
                    <div className="bg-[rgba(30,26,23,0.3)] rounded-2xl p-4 flex flex-col gap-1 border border-[rgba(229,211,179,0.03)] backdrop-blur-sm">
                       <span className="flex items-center gap-2 text-[9px] text-soma-sand/40 uppercase font-bold tracking-widest mb-1">
                         <Calendar size={12} className="text-soma-terracotta/50"/> Expiry
                       </span>
                       <span className="text-lg font-medium text-soma-sand pt-0.5">{item.expirationDate}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative animate-fade-in-up pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6 px-2">
        <div>
          <h2 className="text-4xl md:text-5xl font-black mb-3 tracking-tight text-soma-sand drop-shadow-lg uppercase">
            Inventory
          </h2>
          <div className="flex flex-col gap-1">
            <p className="text-soma-gold font-medium tracking-widest uppercase text-xs opacity-70">Resource Registry r. 2026</p>
            {lastUpdated && (
              <p className="text-[10px] font-bold text-soma-sand/30 uppercase tracking-[0.15em] flex items-center gap-2">
                <Clock size={10} className="text-soma-gold/40" /> Last sync: {lastUpdated}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-soma-sand/30 group-focus-within:text-soma-gold transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder="Search resources..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="bg-[rgba(30,26,23,0.4)] border border-[rgba(229,211,179,0.1)] rounded-2xl pl-12 pr-6 py-3.5 text-sm text-soma-sand outline-none focus:border-soma-gold/40 transition-all w-full sm:w-64 backdrop-blur-md"
                />
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => toggleSort('expirationDate')}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${sortField === 'expirationDate' ? 'bg-soma-gold/10 border-soma-gold/30 text-soma-gold' : 'bg-[rgba(30,26,23,0.4)] border-[rgba(229,211,179,0.1)] text-soma-sand/50'}`}
                >
                    <ArrowUpDown size={14} /> Expiry
                </button>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-soma-gold text-[#1E1A17] p-3.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-soma-sand transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                >
                    <Plus size={16} strokeWidth={3} /> Add New
                </button>
            </div>
        </div>
      </div>

      <div className="relative z-10">
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center">
             <div className="w-12 h-12 rounded-full border-b-2 border-soma-gold animate-spin mb-6 opacity-50"></div>
             <p className="text-soma-gold font-bold tracking-[0.3em] text-[10px] uppercase">Calibrating Registry...</p>
          </div>
        ) : (
          <>
            {renderSection("lodowka", "Fridge", "🧊", "text-blue-400", groupedItems.lodowka)}
            {renderSection("spizarnia", "Pantry", "🥫", "text-soma-gold", groupedItems.spizarnia)}
            {renderSection("zamrazarka", "Freezer", "❄️", "text-cyan-200", groupedItems.zamrazarka)}
            {hasMore && (
              <button
                onClick={() => loadItems(items.length)}
                disabled={isLoadingMore}
                className="w-full mt-4 py-4 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-soma-sand/60 transition-all hover:border-soma-gold/40 hover:text-soma-sand disabled:opacity-50"
              >
                {isLoadingMore ? 'Retrieving Resources...' : 'Load More'}
              </button>
            )}
            
            {items.length === 0 && !filterText && (
              <div className="col-span-full glass-card rounded-[2.5rem] p-20 text-center flex flex-col items-center justify-center border-dashed border-[rgba(229,211,179,0.1)]">
                <PackageOpen size={64} className="text-soma-sand/20 mb-6" strokeWidth={1} />
                <h3 className="text-xl font-medium mb-2 text-soma-sand">Registry Empty</h3>
                <p className="text-soma-sand/40 text-sm max-w-xs mx-auto">Initialize your resource registry by adding newly acquired matter.</p>
              </div>
            )}
          </>
        )}
      </div>

      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-10 right-6 md:right-12 w-16 h-16 bg-soma-gold text-[#1E1A17] rounded-2xl flex items-center justify-center shadow-[0_10px_40px_rgba(212,175,55,0.2)] hover:shadow-[0_15px_60px_rgba(212,175,55,0.4)] hover:scale-105 active:scale-95 transition-all z-40 duration-300"
      >
        <Plus size={32} strokeWidth={2.5} />
      </button>

      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-[#1E1A17]/80 backdrop-blur-xl" onClick={() => setIsModalOpen(false)}></div>
           
           <div className="glass-card bg-[rgba(30,26,23,0.9)] border-[rgba(229,211,179,0.15)] p-8 md:p-10 rounded-[3rem] w-full max-w-lg relative z-10 animate-fade-in-up shadow-[0_0_100px_rgba(0,0,0,0.5)]">
             <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-soma-sand/40 hover:text-soma-sand transition-colors bg-white/5 p-2.5 rounded-xl">
               <X size={18} />
             </button>
             
             <h2 className="text-2xl font-black mb-10 text-soma-sand tracking-tighter uppercase">Initialize Resource</h2>
             
             <form onSubmit={handleAdd} className="space-y-6">
               <div>
                 <label className="block text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em]">Identifier</label>
                 <input required value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-black/40 border border-[rgba(229,211,179,0.1)] rounded-2xl px-6 py-4 text-soma-sand focus:border-soma-gold/50 transition-all outline-none font-medium" placeholder="Matter name (e.g. Pure Whey)" />
               </div>
               
               <div className="flex gap-4">
                 <div className="flex-[3]">
                   <label className="block text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em]">Magnitude</label>
                   <div className="flex gap-2">
                     <input required value={quantity} onChange={e => setQuantity(e.target.value)} type="number" min="1" className="flex-1 bg-black/40 border border-[rgba(229,211,179,0.1)] rounded-2xl px-6 py-4 text-soma-sand focus:border-soma-gold/50 transition-all outline-none font-medium" placeholder="1000" />
                     <select value={unit} onChange={e => setUnit(e.target.value as 'g' | 'szt')} className="bg-black/40 border border-[rgba(229,211,179,0.1)] rounded-2xl px-4 py-4 text-soma-sand focus:border-soma-gold/50 transition-all outline-none font-medium cursor-pointer">
                        <option value="g">g</option>
                        <option value="szt">pcs</option>
                     </select>
                   </div>
                 </div>
                 <div className="flex-[2]">
                   <label className="block text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em]">Sector</label>
                   <select value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-black/40 border border-[rgba(229,211,179,0.1)] rounded-2xl px-6 py-4 text-soma-sand focus:border-soma-gold/50 transition-all outline-none font-medium cursor-pointer">
                     <option value="lodowka">Fridge</option>
                     <option value="spizarnia">Pantry</option>
                     <option value="zamrazarka">Freezer</option>
                   </select>
                 </div>
               </div>

               <div>
                 <label className="block text-[10px] font-black text-soma-sand/40 mb-3 uppercase tracking-[0.2em]">Decomposition (Expiry)</label>
                 <input required value={expDate} onChange={e => setExpDate(e.target.value)} type="date" className="w-full bg-black/40 border border-[rgba(229,211,179,0.1)] rounded-2xl px-6 py-4 text-soma-sand focus:border-soma-gold/50 transition-all outline-none [color-scheme:dark] font-medium" />
               </div>

               <button type="submit" className="w-full bg-soma-gold text-[#1E1A17] font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all hover:bg-soma-sand mt-6 shadow-[0_10px_30px_rgba(212,175,55,0.15)]">
                 Commit to Registry
               </button>
             </form>
           </div>
         </div>
      )}
    </div>
  );
}
