import { Sidebar } from './Sidebar';
import { UsageGuide } from '@/components/guide/UsageGuide';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary/20 selection:text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-950 to-zinc-950" />
      <div className="fixed inset-0 z-[-1] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none" />
      
      <Sidebar />
      <UsageGuide />
      
      <main className="relative pl-0 md:pl-64 min-h-screen transition-[padding] duration-300 ease-in-out flex flex-col">
        <div className="container mx-auto p-6 md:p-8 max-w-[1600px] flex-1 animate-fade-in-0">
          {children}
        </div>
      </main>
    </div>
  );
}
