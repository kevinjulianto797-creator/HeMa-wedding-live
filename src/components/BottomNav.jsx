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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-200 backdrop-blur-xl shadow-lg sm:hidden">
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
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-transform ${
                    isActive
                      ? 'bg-navy-950 text-white scale-110 shadow-navy-glow ring-2 ring-gold-400'
                      : 'bg-navy-900 text-white hover:scale-105'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span
                  className={`text-[10px] mt-1 font-semibold ${
                    isActive ? 'text-navy-950' : 'text-slate-500'
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
                  ? 'text-navy-950 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
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
