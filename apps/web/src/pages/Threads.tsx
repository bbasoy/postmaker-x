import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalContent,
  ModalFooter,
} from '@/components/ui/modal';
import { useGenerate } from '@/hooks/useGenerate';
import type { PostAnalysis } from '@postmaker/shared';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Split,
  ListOrdered,
  Sparkles,
  PenLine,
  GripVertical,
  Settings2
} from 'lucide-react';

interface ThreadPart {
  id: string;
  content: string;
  analysis?: PostAnalysis;
}

interface ThreadOptions {
  maxParts: number;
  addHook: boolean;
  addCTA: boolean;
}

interface ThreadAnalysis {
  totalScore: number;
  hookStrength: number;
  flowScore: number;
  ctaEffectiveness: number;
  partScores: { id: string; score: number }[];
  suggestions: string[];
}

const MAX_TWEET_LENGTH = 280;

type BadgeVariant = 'success' | 'warning' | 'danger';

function getCharCountVariant(count: number): BadgeVariant {
  if (count > MAX_TWEET_LENGTH) return 'danger';
  if (count > MAX_TWEET_LENGTH - 20) return 'warning';
  return 'success';
}

function splitContentIntoThread(
  content: string,
  maxParts: number,
  addHook: boolean,
  addCTA: boolean
): ThreadPart[] {
  const sentences = content.split(/(?<=[.!?])\s+/);
  const parts: ThreadPart[] = [];
  let currentPart = '';
  let partCount = 0;

  for (const sentence of sentences) {
    const potentialPart = currentPart
      ? `${currentPart} ${sentence}`
      : sentence;

    const numbering = `${partCount + 1}/`;
    const availableLength = MAX_TWEET_LENGTH - numbering.length - 1;

    if (potentialPart.length <= availableLength) {
      currentPart = potentialPart;
    } else {
      if (currentPart) {
        parts.push({
          id: crypto.randomUUID(),
          content: currentPart.trim(),
        });
        partCount++;
        if (partCount >= maxParts) break;
      }
      currentPart = sentence;
    }
  }

  if (currentPart && partCount < maxParts) {
    parts.push({
      id: crypto.randomUUID(),
      content: currentPart.trim(),
    });
  }

  if (parts.length > 0 && addHook) {
    const firstPart = parts[0];
    if (
      firstPart &&
      !firstPart.content.includes('?') &&
      !firstPart.content.match(/^(Here|This|I|You|Let|Want|Ready|Ever)/i)
    ) {
      parts[0] = {
        id: firstPart.id,
        content: `Thread: ${firstPart.content}`,
      };
    }
  }

  if (parts.length > 1 && addCTA) {
    const lastPart = parts[parts.length - 1];
    if (
      lastPart &&
      !lastPart.content.match(/(follow|like|retweet|share|comment|reply)/i)
    ) {
      const ctas = [
        '\n\nFollow for more.',
        '\n\nRT to share.',
        '\n\nLike if this helped.',
      ];
      const randomCTA = ctas[Math.floor(Math.random() * ctas.length)] ?? '';
      const newContent = lastPart.content + randomCTA;
      if (newContent.length <= MAX_TWEET_LENGTH - 5) {
        parts[parts.length - 1] = {
          id: lastPart.id,
          content: newContent,
        };
      }
    }
  }

  return parts.length > 0
    ? parts
    : [{ id: crypto.randomUUID(), content: '' }];
}

function analyzeThread(parts: ThreadPart[]): ThreadAnalysis {
  const partScores = parts.map((part) => {
    let score = 50;

    if (part.content.length > 50) score += 10;
    if (part.content.length > 150) score += 10;
    if (part.content.includes('?')) score += 5;
    if (part.content.match(/\d+/)) score += 5;
    if (part.content.length > MAX_TWEET_LENGTH) score -= 20;

    score = Math.min(100, Math.max(0, score));
    return { id: part.id, score };
  });

  const avgScore =
    partScores.reduce((sum, p) => sum + p.score, 0) / partScores.length;

  const firstPart = parts[0]?.content || '';
  let hookStrength = 50;
  if (firstPart.startsWith('Thread:')) hookStrength += 15;
  if (firstPart.includes('?')) hookStrength += 15;
  if (firstPart.match(/^(Here|This|I|You|Let|Want|Ready|Ever)/i))
    hookStrength += 10;
  if (firstPart.length > 100 && firstPart.length < 200) hookStrength += 10;
  hookStrength = Math.min(100, hookStrength);

  const lastPart = parts[parts.length - 1]?.content || '';
  let ctaEffectiveness = 50;
  if (lastPart.match(/(follow|like|retweet|share|comment|reply)/i))
    ctaEffectiveness += 30;
  if (lastPart.includes('?')) ctaEffectiveness += 10;
  ctaEffectiveness = Math.min(100, ctaEffectiveness);

  let flowScore = 70;
  for (let i = 1; i < parts.length; i++) {
    const prevPart = parts[i - 1];
    const currPart = parts[i];
    if (!prevPart || !currPart) continue;
    const prev = prevPart.content.toLowerCase();
    const curr = currPart.content.toLowerCase();
    const prevWords = prev.split(/\s+/).slice(-3);
    const currWords = curr.split(/\s+/).slice(0, 3);
    const hasConnection = prevWords.some(
      (w) => currWords.includes(w) && w.length > 3
    );
    if (hasConnection) flowScore += 5;
  }
  flowScore = Math.min(100, flowScore);

  const suggestions: string[] = [];
  if (hookStrength < 70) {
    suggestions.push('Add a stronger hook to your first tweet');
  }
  if (ctaEffectiveness < 70) {
    suggestions.push('Add a call-to-action to your last tweet');
  }
  if (flowScore < 75) {
    suggestions.push('Improve transitions between tweets for better flow');
  }
  if (parts.some((p) => p.content.length > MAX_TWEET_LENGTH)) {
    suggestions.push('Some tweets exceed character limit');
  }
  if (parts.length < 3) {
    suggestions.push('Threads with 3+ tweets tend to perform better');
  }

  return {
    totalScore: Math.round(avgScore * 0.4 + hookStrength * 0.3 + flowScore * 0.3),
    hookStrength,
    flowScore,
    ctaEffectiveness,
    partScores,
    suggestions,
  };
}

export function Threads(): JSX.Element {
  const [sourceContent, setSourceContent] = useState('');
  const [parts, setParts] = useState<ThreadPart[]>([
    { id: crypto.randomUUID(), content: '' },
  ]);
  const [options, setOptions] = useState<ThreadOptions>({
    maxParts: 5,
    addHook: true,
    addCTA: true,
  });
  const [editingPart, setEditingPart] = useState<ThreadPart | null>(null);
  const [editContent, setEditContent] = useState('');
  const [threadAnalysis, setThreadAnalysis] = useState<ThreadAnalysis | null>(
    null
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const { generate, isGenerating } = useGenerate({
    onSuccess: (data) => {
      if (data.threadParts && data.threadParts.length > 0) {
        const newParts = data.threadParts.map((content) => ({
          id: crypto.randomUUID(),
          content,
        }));
        setParts(newParts);
        setThreadAnalysis(analyzeThread(newParts));
      }
    },
  });

  const totalCharacters = useMemo(
    () => parts.reduce((sum, p) => sum + p.content.length, 0),
    [parts]
  );

  const handleSplitContent = useCallback(() => {
    if (!sourceContent.trim()) return;
    const newParts = splitContentIntoThread(
      sourceContent,
      options.maxParts,
      options.addHook,
      options.addCTA
    );
    setParts(newParts);
    setThreadAnalysis(analyzeThread(newParts));
  }, [sourceContent, options]);

  const handleAnalyzeThread = useCallback(() => {
    setThreadAnalysis({
      totalScore: 85,
      hookStrength: 90,
      flowScore: 80,
      ctaEffectiveness: 85,
      partScores: parts.map((p) => ({ id: p.id, score: 85 })),
      suggestions: ['Good flow', 'Clear hook'],
    });
  }, [parts]);

  const handleGenerateWithAI = useCallback(() => {
    // Trigger generation
  }, []);

  const addPart = useCallback(() => {
    const newPart: ThreadPart = {
      id: crypto.randomUUID(),
      content: '',
    };
    setParts([...parts, newPart]);
  }, [parts]);

  const removePart = useCallback((id: string) => {
    setParts(parts.filter((p) => p.id !== id));
  }, [parts]);

  const updatePart = useCallback((id: string, content: string) => {
    setParts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, content } : p))
    );
  }, []);

  const openEditor = useCallback((part: ThreadPart) => {
    setEditingPart(part);
    setEditContent(part.content);
  }, []);

  const saveEdit = useCallback(() => {
    if (editingPart) {
      updatePart(editingPart.id, editContent);
      setEditingPart(null);
      setEditContent('');
    }
  }, [editingPart, editContent, updatePart]);

  const cancelEdit = useCallback(() => {
    setEditingPart(null);
    setEditContent('');
  }, []);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === index) return;

      setParts((prev) => {
        const newParts = [...prev];
        const draggedPart = newParts[draggedIndex];
        if (!draggedPart) return prev;
        newParts.splice(draggedIndex, 1);
        newParts.splice(index, 0, draggedPart);
        return newParts;
      });
      setDraggedIndex(index);
    },
    [draggedIndex]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const copyAllToClipboard = useCallback(async () => {
    const threadText = parts
      .map((part, index) => `${index + 1}/${parts.length}\n${part.content}`)
      .join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(threadText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [parts]);

  return (
    <div className="mx-auto max-w-[1600px] p-6 h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <ListOrdered className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Thread Composer</h1>
            <p className="text-sm text-zinc-400">Transform long-form content into engaging threads</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 h-full">
        {/* Left Panel - Input & Generator */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-border/5 bg-card/50 backdrop-blur-sm sticky top-6">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Split className="w-5 h-5 text-blue-400" />
                <CardTitle>Source Content</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Textarea
                placeholder="Paste your article, notes, or thoughts here..."
                value={sourceContent}
                onChange={(e) => setSourceContent(e.target.value)}
                autoResize
                className="min-h-[300px] text-base leading-relaxed resize-none bg-zinc-900/50 border-zinc-800 focus:border-blue-500/50"
              />

              <div className="space-y-4 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-300 pb-2 border-b border-zinc-800/50">
                  <Settings2 className="w-4 h-4" />
                  Configuration
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-400">Max Tweets</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={3}
                        max={10}
                        value={options.maxParts}
                        onChange={(e) =>
                          setOptions((prev) => ({
                            ...prev,
                            maxParts: Number(e.target.value),
                          }))
                        }
                        className="h-1.5 w-24 cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-blue-500"
                      />
                      <span className="w-6 text-center text-sm font-mono text-zinc-300 bg-zinc-800 rounded px-1">
                        {options.maxParts}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Viral Hook</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={options.addHook}
                        onChange={(e) =>
                          setOptions((prev) => ({
                            ...prev,
                            addHook: e.target.checked,
                          }))
                        }
                      />
                      <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Call to Action</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={options.addCTA}
                        onChange={(e) =>
                          setOptions((prev) => ({
                            ...prev,
                            addCTA: e.target.checked,
                          }))
                        }
                      />
                      <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleSplitContent}
                disabled={!sourceContent.trim()}
                className="w-full h-11 shadow-lg shadow-blue-500/20"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Thread
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Thread Preview */}
        <div className="space-y-6 lg:col-span-2">
          <AnimatePresence mode="wait">
            {parts.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 backdrop-blur-sm">
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <div className="flex items-center gap-2">
                      <ListOrdered className="w-4 h-4" />
                      <span className="text-zinc-200 font-medium">{parts.length}</span> tweets
                    </div>
                    <div className="w-px h-4 bg-zinc-700" />
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-200 font-medium">{totalCharacters}</span> chars
                    </div>
                    {/* Hidden Analysis Trigger for future use */}
                    {false && <Button variant="ghost" size="sm" onClick={handleAnalyzeThread} disabled={isGenerating}>Analyze</Button>}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={copyAllToClipboard}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                  >
                    {copySuccess ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copySuccess ? 'Copied!' : 'Copy Thread'}
                  </Button>
                </div>

                <div className="space-y-4">
                  <AnimatePresence>
                    {parts.map((part, index) => (
                      <motion.div
                        key={part.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`group relative rounded-xl border transition-all ${draggedIndex === index
                            ? 'border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10 z-10'
                            : 'border-border/10 bg-card/50 hover:border-border/30 hover:bg-card/80'
                          }`}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center cursor-grab active:cursor-grabbing border-r border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-4 h-4 text-zinc-600" />
                        </div>

                        <div className="flex items-start gap-4 p-5 pl-12">
                          <div className="absolute left-4 top-5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800/80 text-xs font-mono font-medium text-zinc-400 border border-zinc-700/50 group-hover:opacity-0 transition-opacity">
                            {index + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="whitespace-pre-wrap text-zinc-200 text-base leading-relaxed">
                              {part.content || (
                                <span className="text-zinc-600 italic">
                                  Empty tweet...
                                </span>
                              )}
                            </p>

                            <div className="mt-4 flex items-center justify-between pt-4 border-t border-white/5">
                              <Badge
                                variant={getCharCountVariant(part.content.length)}
                                size="sm"
                                className="font-mono text-[10px]"
                              >
                                {part.content.length}/{MAX_TWEET_LENGTH}
                              </Badge>

                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditor(part)}
                                  className="h-8 w-8 p-0 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10"
                                >
                                  <PenLine className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePart(part.id)}
                                  className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Connecting Line */}
                        {index !== parts.length - 1 && (
                          <div className="absolute left-[27px] bottom-[-20px] w-0.5 h-6 bg-zinc-800 -z-10 group-hover:bg-zinc-700 transition-colors" />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <motion.button
                    layout
                    onClick={addPart}
                    className="w-full py-3 rounded-xl border border-dashed border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Tweet
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20"
              >
                <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-zinc-800">
                  <GhostThreadIcon />
                </div>
                <h3 className="text-xl font-semibold text-zinc-200 mb-2">Start a New Thread</h3>
                <p className="text-zinc-500 max-w-md mb-8">
                  Paste your content on the left to automatically split it into a perfectly formatted thread, or start writing from scratch.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Modal open={!!editingPart} onClose={cancelEdit}>
        <ModalHeader>
          <ModalTitle>Edit Tweet</ModalTitle>
          <ModalClose onClick={cancelEdit} />
        </ModalHeader>
        <ModalContent>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            maxLength={MAX_TWEET_LENGTH}
            showCount
            autoResize
            className="min-h-[120px]"
          />
          <div className="mt-2">
            <Badge
              variant={getCharCountVariant(editContent.length)}
              size="sm"
            >
              {editContent.length}/{MAX_TWEET_LENGTH}
            </Badge>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="ghost" onClick={cancelEdit}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveEdit}>
            Save
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

function GhostThreadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M13 8H7" />
      <path d="M17 12H7" />
    </svg>
  )
}
