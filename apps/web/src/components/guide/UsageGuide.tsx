import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, PenTool, Wand2, BarChart2 } from 'lucide-react';
import { useGuideStore } from '@/stores/guide';
import { Button } from '@/components/ui/button';

export function UsageGuide() {
  const { isOpen, toggle } = useGuideStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggle}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 h-full w-[400px] border-l border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/10 p-6">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold">Usage Guide</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={toggle}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="space-y-8">
                  {/* Section 1: Post Analyzer */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <BarChart2 className="h-5 w-5" />
                      <h3 className="font-semibold">Post Analyzer</h3>
                    </div>
                    <div className="space-y-3 text-sm text-zinc-400">
                      <p>
                        The Analyzer helps you optimize your posts for maximum engagement before you publish.
                      </p>
                      <ul className="list-disc pl-4 space-y-2">
                        <li>
                          <strong className="text-zinc-200">Write or Paste:</strong> Enter your post content in the editor.
                        </li>
                        <li>
                          <strong className="text-zinc-200">Real-time Stats:</strong> Watch character counts and basic metrics update as you type.
                        </li>
                        <li>
                          <strong className="text-zinc-200">Analyze:</strong> Click "Analyze Post" to get a detailed breakdown of your post's potential.
                        </li>
                        <li>
                          <strong className="text-zinc-200">Score:</strong> Aim for a score of 80+ for best results.
                        </li>
                      </ul>
                    </div>
                  </section>

                  <div className="h-px bg-white/5" />

                  {/* Section 2: AI Generator */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-violet-400">
                      <Wand2 className="h-5 w-5" />
                      <h3 className="font-semibold">AI Generator</h3>
                    </div>
                    <div className="space-y-3 text-sm text-zinc-400">
                      <p>
                        Stuck on what to write? Let our AI assistant help you draft engaging content.
                      </p>
                      <div className="rounded-lg bg-zinc-900/50 p-4 border border-white/5">
                        <p className="mb-2 font-medium text-zinc-300">Pro Tips:</p>
                        <ul className="list-disc pl-4 space-y-1 text-xs">
                          <li>Choose "Controversial" for higher engagement (use carefully).</li>
                          <li>"Story" mode is great for threads.</li>
                          <li>Use constraints to force hashtags or emojis.</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <div className="h-px bg-white/5" />

                  {/* Section 3: Best Practices */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <PenTool className="h-5 w-5" />
                      <h3 className="font-semibold">Writing Best Practices</h3>
                    </div>
                    <div className="space-y-3 text-sm text-zinc-400">
                      <p>
                        To maximize your reach on X (Twitter):
                      </p>
                      <ul className="space-y-2">
                        <li className="flex gap-2">
                          <span className="text-emerald-400">✓</span>
                          <span>Keep the hook (first line) strong and punchy.</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-emerald-400">✓</span>
                          <span>Use whitespace (line breaks) to make text readable.</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-emerald-400">✓</span>
                          <span>Ask questions to encourage replies.</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-emerald-400">✓</span>
                          <span>One clear Call-to-Action (CTA) at the end.</span>
                        </li>
                      </ul>
                    </div>
                  </section>
                </div>
              </div>
              
              <div className="p-6 border-t border-white/10 bg-zinc-900/50">
                <p className="text-xs text-center text-zinc-500">
                  PostMaker X v0.1.0 &bull; Built for Creators
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
