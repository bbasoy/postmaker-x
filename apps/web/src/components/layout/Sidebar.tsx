import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Clock, 
  LayoutTemplate, 
  HelpCircle,
  Settings,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGuideStore } from '@/stores/guide';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Analyzer' },
  { to: '/threads', icon: MessageSquare, label: 'Threads' },
  { to: '/timing', icon: Clock, label: 'Timing' },
  { to: '/templates', icon: LayoutTemplate, label: 'Templates' },
];

export function Sidebar() {
  const { toggle } = useGuideStore();

  return (
    <aside className="fixed left-0 top-0 z-30 h-screen w-64 border-r border-border bg-card/50 backdrop-blur-xl hidden md:flex flex-col">
      {/* Logo Area */}
      <div className="flex h-16 items-center px-6 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/25">
            <Zap className="h-5 w-5 text-primary-foreground fill-current" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            PostMaker X
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                isActive 
                  ? "text-white bg-white/5 shadow-inner" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-primary" : "text-zinc-500 group-hover:text-zinc-300")} />
                <span>{label}</span>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_12px_rgba(124,58,237,0.5)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border/50 space-y-1">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          <span>Guide & Help</span>
        </button>
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>
      </div>
      
      {/* User/Status Section (Mock) */}
      <div className="p-4 bg-black/20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-zinc-200">Demo User</span>
            <span className="text-[10px] text-zinc-500">Pro Plan</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
