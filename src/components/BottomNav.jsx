import React from 'react';
import { Home, QrCode, Image, MessageSquareHeart } from 'lucide-react';

export function BottomNav({ activePage, setActivePage }) {
  const navItems = [
    { id: 'home', label: 'Beranda', icon: Home },
    { id: 'checkin', label: 'Check-in', icon: QrCode, highlight: true },
    { id: 'moments', label: 'Galeri', icon: Image },
    { id: 'wishes', label: 'Ucapan', icon: MessageSquareHeart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-navy border-t border-gold-500/20 backdrop-blur-xl sm:hidden">
      <div className="flex items-center justify-around px-4 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          if (item.highlight) {
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className="flex flex-col items-center -mt-5 group"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                    isActive
                      ? 'bg-gradient-to-r from-gold-500 to-amber-400 text-navy-950 scale-110 shadow-gold-glow'
                      : 'bg-navy-800 border-2 border-gold-400 text-gold-300 hover:scale-105'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span
                  className={`text-[10px] mt-1 font-semibold ${
                    isActive ? 'text-gold-400' : 'text-slate-300'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
                isActive
                  ? 'text-gold-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
