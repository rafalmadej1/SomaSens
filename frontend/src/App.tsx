import { useState } from 'react';
import { Home as HomeIcon, Activity as ActivityIcon, Info, Dna, LogOut, User as UserIcon, NotebookTabs, BrainCircuit } from 'lucide-react';
import { Pantry } from './components/Pantry';
import { AIAssistant } from './components/AIAssistant';
import { Activities } from './components/Activities';
import { Home } from './components/Home';
import { About } from './components/About';
import { Profile } from './components/Profile';
import { Auth } from './components/Auth';
import { logoutUser } from './api';

type ViewMode = 'home' | 'pantry' | 'activities' | 'ai' | 'profile' | 'about';

function App() {
   const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('somasense_token'));
   const [activeView, setActiveView] = useState<ViewMode>('home');

   const handleLogout = async () => {
      await logoutUser();
      setIsAuthenticated(false);
   };

   const [dustParticles] = useState(() => {
      return Array.from({ length: 40 }).map((_, i) => ({
         id: i,
         left: `${Math.random() * 100}vw`,
         size: Math.random() * 4 + 1,
         duration: Math.random() * 10 + 8,
         delay: -(Math.random() * 20),
         opacity: Math.random() * 0.4 + 0.15,
         isTerracotta: Math.random() > 0.5
      }));
   });

   if (!isAuthenticated) {
      return <Auth onLogin={() => setIsAuthenticated(true)} />;
   }

   return (
      <div className="min-h-screen pt-24 px-4 sm:px-10 font-sans relative overflow-x-hidden selection:bg-soma-terracotta/30 selection:text-soma-sand transition-colors duration-1000 text-soma-sand">

         {/* Background Layer */}
         <div className="fixed top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-[2000ms] opacity-100 z-[-1]">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(30,26,23,0.3)] to-transparent opacity-50"></div>
            <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-soma-terracotta/10 rounded-full mix-blend-screen filter blur-[150px] animate-float"></div>
            <div className="absolute top-[30%] left-[-10%] w-[600px] h-[600px] bg-soma-gold/10 rounded-full mix-blend-screen filter blur-[150px] animate-float" style={{ animationDelay: '1s' }}></div>

            {dustParticles.map(p => (
               <div
                  key={p.id}
                  className={`absolute bottom-[-10%] rounded-full ${p.isTerracotta ? 'bg-soma-terracotta' : 'bg-soma-gold'} blur-[1px]`}
                  style={{
                     left: p.left,
                     width: `${p.size}px`,
                     height: `${p.size}px`,
                     opacity: p.opacity,
                     animation: `float-particle ${p.duration}s linear infinite`,
                     animationDelay: `${p.delay}s`
                  }}
               />
            ))}
         </div>

         {/* Primary Navigation */}
         <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
            <header className="glass-panel rounded-[2rem] px-3 sm:px-4 py-3 flex items-center justify-between border-[rgba(229,211,179,0.06)] shadow-lg">
               <div className="flex items-center gap-4 cursor-pointer pl-1 sm:pl-2 shrink-0" onClick={() => setActiveView('home')}>
                  <div className="relative w-10 h-10 rounded-[0.8rem] bg-gradient-to-br from-[rgba(229,211,179,0.08)] to-transparent border border-soma-gold/30 flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(212,175,55,0.08)]">
                     <Dna size={22} className="text-soma-gold drop-shadow-sm" strokeWidth={1.5} />
                  </div>
                  <h1 className="text-xl font-medium tracking-wide text-soma-sand hidden lg:block opacity-90">
                     Soma<span className="text-soma-gold drop-shadow-[0_0_15px_rgba(255,215,0,0.3)]">Sense</span>
                  </h1>
               </div>

               <div className="flex items-center overflow-x-auto no-scrollbar justify-start sm:justify-center w-full lg:w-auto px-2">
                  <nav className="flex gap-1 sm:gap-2 shrink-0">
                     <button
                        onClick={() => setActiveView('home')}
                        className={`relative px-3 py-2.5 rounded-xl text-[10px] sm:text-xs font-semibold normal-case tracking-wider transition-all duration-300 flex items-center gap-2 overflow-hidden ${activeView === 'home' ? 'text-soma-sand' : 'text-[rgba(229,211,179,0.5)] hover:text-soma-sand'}`}
                     >
                        {activeView === 'home' && <div className="absolute inset-0 bg-soma-sand/10 border border-soma-sand/10 z-0 rounded-xl"></div>}
                        <HomeIcon size={16} className="relative z-10" />
                        <span className="relative z-10 hidden sm:block">Home</span>
                     </button>

                     <button
                        onClick={() => setActiveView('ai')}
                        className={`relative px-3 py-2.5 rounded-xl text-[10px] sm:text-xs font-semibold normal-case tracking-wider transition-all duration-300 flex items-center gap-2 overflow-hidden ${activeView === 'ai' ? 'text-soma-gold' : 'text-[rgba(229,211,179,0.5)] hover:text-soma-sand'}`}
                     >
                        {activeView === 'ai' && <div className="absolute inset-0 bg-soma-gold/10 border border-soma-gold/20 z-0 rounded-xl"></div>}
                        <BrainCircuit size={16} className="relative z-10" />
                        <span className="relative z-10 hidden sm:block">Soma<span className="text-soma-gold drop-shadow-[0_0_15px_rgba(255,215,0,0.3)]">AI</span></span>
                     </button>

                     <button
                        onClick={() => setActiveView('activities')}
                        className={`relative px-3 py-2.5 rounded-xl text-[10px] sm:text-xs font-semibold normal-case tracking-wider transition-all duration-300 flex items-center gap-2 overflow-hidden ${activeView === 'activities' ? 'text-soma-sand' : 'text-[rgba(229,211,179,0.5)] hover:text-soma-sand'}`}
                     >
                        {activeView === 'activities' && <div className="absolute inset-0 bg-soma-sand/10 border border-soma-sand/10 z-0 rounded-xl"></div>}
                        <ActivityIcon size={16} className="relative z-10" />
                        <span className="relative z-10 hidden sm:block">Activities</span>
                     </button>

                     <button
                        onClick={() => setActiveView('pantry')}
                        className={`relative px-3 py-2.5 rounded-xl text-[10px] sm:text-xs font-semibold normal-case tracking-wider transition-all duration-300 flex items-center gap-2 overflow-hidden ${activeView === 'pantry' ? 'text-soma-sand' : 'text-[rgba(229,211,179,0.5)] hover:text-soma-sand'}`}
                     >
                        {activeView === 'pantry' && <div className="absolute inset-0 bg-soma-sand/10 border border-soma-sand/10 z-0 rounded-xl"></div>}
                        <NotebookTabs size={16} className="relative z-10" />
                        <span className="relative z-10 hidden sm:block">Inventory</span>
                     </button>

                     <button
                        onClick={() => setActiveView('about')}
                        className={`relative px-3 py-2.5 rounded-xl text-[10px] sm:text-xs font-semibold normal-case tracking-wider transition-all duration-300 flex items-center gap-2 overflow-hidden ${activeView === 'about' ? 'text-soma-sand' : 'text-[rgba(229,211,179,0.5)] hover:text-soma-sand'}`}
                     >
                        {activeView === 'about' && <div className="absolute inset-0 bg-[rgba(229,211,179,0.05)] border border-soma-sand/10 z-0 rounded-xl"></div>}
                        <Info size={16} className="relative z-10" />
                        <span className="relative z-10 hidden sm:block">System</span>
                     </button>

                     <button
                        onClick={() => setActiveView('profile')}
                        className={`relative px-3 py-2.5 rounded-xl text-[10px] sm:text-xs font-semibold normal-case tracking-wider transition-all duration-300 flex items-center gap-2 overflow-hidden ${activeView === 'profile' ? 'text-soma-terracotta' : 'text-[rgba(229,211,179,0.5)] hover:text-soma-sand'}`}
                     >
                        {activeView === 'profile' && <div className="absolute inset-0 bg-soma-terracotta/10 border border-[rgba(211,115,82,0.2)] z-0 rounded-xl"></div>}
                        <UserIcon size={16} className="relative z-10" />
                        <span className="relative z-10 hidden sm:block">Profile</span>
                     </button>
                  </nav>
               </div>

               <div className="flex shrink-0">
                  <button
                     onClick={handleLogout}
                     className="p-2 sm:p-2.5 rounded-xl bg-[rgba(229,211,179,0.02)] border border-transparent text-[rgba(229,211,179,0.4)] hover:text-soma-terracotta hover:bg-soma-terracotta/10 transition-all active:scale-95 duration-200 shrink-0"
                     title="Logout"
                  >
                     <LogOut size={16} />
                  </button>
               </div>
            </header>
         </div>

         <main className="max-w-7xl mx-auto mt-6 relative z-10 pb-20">
            <div className="animate-fade-in-up" key={activeView}>
               {activeView === 'home' && <Home onNavigate={setActiveView} />}
               {activeView === 'pantry' && <Pantry />}
               {activeView === 'activities' && <Activities />}
               {activeView === 'ai' && <AIAssistant />}
               {activeView === 'profile' && <Profile />}
               {activeView === 'about' && <About />}
            </div>
         </main>

      </div>
   );
}

export default App;
