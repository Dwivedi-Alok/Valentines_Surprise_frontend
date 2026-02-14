import { Link, useLocation } from 'react-router-dom';

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/todos', label: 'Tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { path: '/urls', label: 'Links', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    { path: '/media', label: 'Media', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { path: '/video-call', label: 'Video', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', isSpecial: true },
    { path: '/games', label: 'Games', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
    { path: '/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Gradient fade above navbar */}
      <div className="h-6 bg-gradient-to-t from-white/90 to-transparent pointer-events-none" />
      
      {/* Nav bar */}
      <nav className="bg-white/95 backdrop-blur-xl border-t border-rose-100/80 shadow-[0_-4px_20px_rgba(244,63,94,0.08)]">
        <div className="flex items-center justify-around px-1 h-[68px] w-full max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            // Special center button for Video
            if (item.isSpecial) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => navigator.vibrate?.(50)}
                  className="relative -mt-6 flex flex-col items-center"
                >
                  <div className={`
                    w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300
                    ${isActive 
                      ? 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-300/50 scale-110' 
                      : 'bg-gradient-to-br from-rose-400 to-pink-500 shadow-rose-200/40 hover:scale-105'
                    }
                  `}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                  </div>
                  <span className={`text-[9px] font-semibold mt-1 transition-colors duration-300 ${isActive ? 'text-rose-600' : 'text-slate-400'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            }
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => navigator.vibrate?.(30)}
                className={`
                  relative flex flex-col items-center justify-center py-2 px-1 min-w-[48px]
                  transition-all duration-300 ease-out active:scale-90
                  ${isActive ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'}
                `}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute top-0.5 w-5 h-1 rounded-full bg-gradient-to-r from-rose-400 to-pink-500" />
                )}
                
                <div className={`
                  p-1.5 rounded-xl transition-all duration-300
                  ${isActive ? 'bg-rose-50/80' : 'bg-transparent'}
                `}>
                  <svg 
                    className={`w-[22px] h-[22px] transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`} 
                    fill={isActive ? "currentColor" : "none"} 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2.5 : 1.8} d={item.icon} />
                  </svg>
                </div>
                
                <span className={`
                  text-[9px] font-semibold tracking-wide transition-all duration-300
                  ${isActive ? 'opacity-100 text-rose-600' : 'opacity-70'}
                `}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
        
        {/* Safe area spacer for devices with home indicators */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </nav>
    </div>
  );
};

export default BottomNav;
