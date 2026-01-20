import { useState } from 'react';
import { usePostStore } from '@/stores/post';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useGenerate } from '@/hooks/useGenerate';
import { useGuideStore } from '@/stores/guide';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select } from '@/components/ui/select';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalContent,
  ModalFooter,
} from '@/components/ui/modal';
import type {
  PostStyle,
  TargetEngagement,
  PostGenerationRequest,
  PostConstraints,
} from '@postmaker/shared';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenTool,
  Wand2,
  Trash2,
  AlertTriangle,
  Info,
  TrendingUp,
  MessageCircle,
  Repeat2,
  Quote,
  Type,
  AlignLeft,
  Image as ImageIcon,
  HelpCircle,
  Sparkles
} from 'lucide-react';

const MAX_CHARACTERS = 280;

const STYLE_OPTIONS = [
  { value: 'informative', label: 'Informative' },
  { value: 'controversial', label: 'Controversial' },
  { value: 'question', label: 'Question' },
  { value: 'thread', label: 'Thread' },
  { value: 'story', label: 'Story' },
  { value: 'hook', label: 'Hook' },
];

const ENGAGEMENT_OPTIONS = [
  { value: 'all', label: 'All Engagement' },
  { value: 'likes', label: 'Likes' },
  { value: 'replies', label: 'Replies' },
  { value: 'retweets', label: 'Retweets' },
  { value: 'quotes', label: 'Quotes' },
  { value: 'shares', label: 'Shares' },
];

function getScoreColorClass(score: number): string {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

function getPriorityVariant(priority: string): 'danger' | 'warning' | 'neutral' {
  switch (priority) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    default:
      return 'neutral';
  }
}


function CircularProgress({ value, size = 120 }: { value: number; size?: number }): JSX.Element {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, value));
  const offset = circumference - (progress / 100) * circumference;
  const colorClass = getScoreColorClass(value);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-zinc-800/50"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={colorClass}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-4xl font-black ${colorClass}`}
        >
          {Math.round(value)}
        </motion.span>
        <span className="text-xs text-zinc-500 font-medium mt-1">SCORE</span>
      </div>
    </div>
  );
}

interface EngagementBarProps {
  label: string;
  value: number;
  icon?: React.ElementType;
}

function EngagementBar({ label, value, icon: Icon }: EngagementBarProps): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm items-center">
        <div className="flex items-center gap-2 text-zinc-300">
          {Icon && <Icon className="w-4 h-4 text-primary/70" />}
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-zinc-400 font-mono text-xs">{Math.round(value)}%</span>
      </div>
      <Progress value={value} size="sm" className="bg-zinc-800/50" />
    </div>
  );
}

export function Home(): JSX.Element {
  const {
    draft,
    setContent,
    setMediaUrls,
    analysis,
    setAnalysis,
    addToHistory,
    clearDraft,
    style,
    setStyle,
    targetEngagement,
    setTargetEngagement,
  } = usePostStore();
  
  const { setOpen: setGuideOpen } = useGuideStore();

  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaUrlError, setMediaUrlError] = useState<string | undefined>(undefined);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateTopic, setGenerateTopic] = useState('');
  const [generateConstraints, setGenerateConstraints] = useState<PostConstraints>({
    includeHashtags: false,
    includeEmojis: false,
    includeCTA: false,
  });

  const { analyze, isAnalyzing } = useAnalysis({
    onSuccess: (data) => {
      setAnalysis(data);
      if (draft.content.trim()) {
        addToHistory(draft.content, data);
      }
    },
  });

  const { generate, isGenerating } = useGenerate({
    onSuccess: (data) => {
      setContent(data.content);
      setIsGenerateModalOpen(false);
      setGenerateTopic('');
      if (data.content.trim()) {
        analyze(data.content);
      }
    },
  });

  const handleAnalyze = () => {
    if (draft.content.trim()) {
      analyze(draft.content);
    }
  };

  const handleClear = () => {
    clearDraft();
    setMediaUrl('');
  };

  const handleGenerate = () => {
    if (!generateTopic.trim()) return;

    const request: PostGenerationRequest = {
      topic: generateTopic,
      style,
      targetEngagement,
      constraints: generateConstraints,
    };

    generate(request);
  };

  const validateMediaUrl = (url: string): string | undefined => {
    if (!url.trim()) {
      return undefined;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return 'Invalid URL format';
    }

    const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
    const isSecure = parsedUrl.protocol === 'https:';
    const isDevHttp = parsedUrl.protocol === 'http:' && isLocalhost;

    if (!isSecure && !isDevHttp) {
      return 'URL must use HTTPS';
    }

    const mediaExtensions = /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov|avi)$/i;
    const hasMediaExtension = mediaExtensions.test(parsedUrl.pathname);
    const isKnownMediaHost = /\.(cloudinary|imgur|giphy|twimg|pbs\.twimg)\./i.test(parsedUrl.hostname);

    if (!hasMediaExtension && !isKnownMediaHost) {
      return 'URL should point to an image or video file';
    }

    return undefined;
  };

  const handleMediaUrlChange = (url: string) => {
    setMediaUrl(url);
    const error = validateMediaUrl(url);
    setMediaUrlError(error);

    if (url.trim() && !error) {
      setMediaUrls([url]);
    } else {
      setMediaUrls([]);
    }
  };

  const characterCount = draft.content.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-4rem)]">
      {/* Left Panel - Post Editor (60%) */}
      <div className="w-full lg:w-[60%] flex flex-col gap-6">
        <Card className="glass flex-1 flex flex-col shadow-2xl shadow-black/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-violet-600 shadow-lg shadow-primary/20">
                <PenTool className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Post Composer</CardTitle>
                <p className="text-xs text-zinc-400 font-medium">Draft your next viral tweet</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs text-zinc-400 hover:text-white"
                onClick={() => setGuideOpen(true)}
              >
                <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                Tips
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-6 p-6">
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="What's happening? Write your post here..."
                value={draft.content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={MAX_CHARACTERS}
                className="w-full h-full min-h-[200px] text-lg leading-relaxed bg-transparent border-none focus:ring-0 resize-none p-0 placeholder:text-zinc-600"
              />
            </div>
            
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 border-t border-white/5 pt-4">
               <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Markdown supported
                  </span>
               </div>
               <span className={isOverLimit ? 'text-red-500' : ''}>
                  {characterCount} / {MAX_CHARACTERS}
               </span>
            </div>

            <div className="space-y-4">
              <div className="relative">
                 <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <ImageIcon className="w-4 h-4 text-zinc-500" />
                 </div>
                 <input 
                    className="w-full bg-zinc-900/30 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Paste image or video URL (optional)..."
                    value={mediaUrl}
                    onChange={(e) => handleMediaUrlChange(e.target.value)}
                 />
                 {mediaUrlError && (
                   <p className="absolute -bottom-5 left-0 text-[10px] text-red-400">{mediaUrlError}</p>
                 )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  onClick={handleAnalyze}
                  disabled={!draft.content.trim() || isAnalyzing || isOverLimit}
                  loading={isAnalyzing}
                  className="flex-1 h-12 text-base shadow-xl shadow-primary/20"
                >
                  {!isAnalyzing && <Sparkles className="w-4 h-4 mr-2" />}
                  Analyze Post
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsGenerateModalOpen(true)}
                  className="h-12 px-6 bg-white/5 hover:bg-white/10 border border-white/10"
                >
                  <Wand2 className="w-4 h-4 mr-2 text-violet-400" />
                  AI Assist
                </Button>
                <Button variant="ghost" onClick={handleClear} className="h-12 w-12 px-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions Panel */}
        <AnimatePresence mode="wait">
          {analysis && analysis.suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-xl p-1 overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                <h3 className="text-sm font-semibold text-zinc-200">Optimization Tips</h3>
              </div>
              <div className="p-2 space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                {analysis.suggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Badge variant={getPriorityVariant(suggestion.priority)} size="sm" className="mt-0.5 text-[10px] px-1.5 py-0 h-5">
                      {suggestion.priority}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 leading-relaxed">{suggestion.message}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 whitespace-nowrap">
                      +{suggestion.potentialScoreIncrease}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Panel - Analysis Results (40%) */}
      <div className="w-full lg:w-[40%] flex flex-col h-full overflow-hidden">
        {analysis ? (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="h-full overflow-y-auto pr-2 custom-scrollbar space-y-4 pb-4"
            >
              {/* Overall Score Card */}
              <Card className="glass border-white/10">
                <CardContent className="flex flex-col items-center py-8">
                  <CircularProgress value={analysis.overallScore} size={180} />
                  <div className="mt-6 text-center space-y-1">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {analysis.overallScore >= 80 ? 'Excellent' :
                        analysis.overallScore >= 60 ? 'Good' :
                          analysis.overallScore >= 40 ? 'Fair' : 'Needs Improvement'}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Performance Score</p>
                  </div>
                </CardContent>
              </Card>

              {/* Engagement Scores Card */}
              <Card className="glass border-white/10">
                <CardHeader className="py-4 border-white/5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <CardTitle className="text-base">Engagement Potential</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 py-4">
                  <EngagementBar
                    label="Likeability"
                    value={analysis.engagementScores.likeability}
                    icon={TrendingUp}
                  />
                  <EngagementBar
                    label="Replyability"
                    value={analysis.engagementScores.replyability}
                    icon={MessageCircle}
                  />
                  <EngagementBar
                    label="Retweetability"
                    value={analysis.engagementScores.retweetability}
                    icon={Repeat2}
                  />
                  <EngagementBar
                    label="Quoteability"
                    value={analysis.engagementScores.quoteability}
                    icon={Quote}
                  />
                </CardContent>
              </Card>

              {/* Content Metrics Card */}
              <Card className="glass border-white/10">
                <CardHeader className="py-4 border-white/5">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-purple-400" />
                    <CardTitle className="text-base">Content Metrics</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Words</div>
                      <div className="text-lg font-mono text-zinc-200">{analysis.contentMetrics.wordCount}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Read Time</div>
                      <div className="text-lg font-mono text-zinc-200">{analysis.contentMetrics.readingTimeSeconds}s</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {analysis.contentMetrics.hasMedia && (
                      <Badge variant="info" size="sm" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">Media</Badge>
                    )}
                    {analysis.contentMetrics.hasQuestion && (
                      <Badge variant="info" size="sm" className="bg-violet-500/10 text-violet-400 hover:bg-violet-500/20">Question</Badge>
                    )}
                    {analysis.contentMetrics.hasHashtags && (
                      <Badge variant="info" size="sm" className="bg-pink-500/10 text-pink-400 hover:bg-pink-500/20">
                        {analysis.contentMetrics.hashtagCount} Tags
                      </Badge>
                    )}
                    {analysis.contentMetrics.hasEmojis && (
                      <Badge variant="info" size="sm" className="bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20">
                        {analysis.contentMetrics.emojiCount} Emojis
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Algorithm Signals Card */}
              <Card className="glass border-white/10">
                 <CardHeader className="py-4 border-white/5">
                  <div className="flex items-center gap-2">
                    <AlignLeft className="w-4 h-4 text-indigo-400" />
                    <CardTitle className="text-base">Signals</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 py-4">
                  {analysis.algorithmSignals.positiveSignals.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2">Positive</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.algorithmSignals.positiveSignals.map((signal, idx) => (
                          <Badge key={idx} variant="success" size="sm" className="border-emerald-500/20 text-[10px]">
                            {signal.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.algorithmSignals.negativeSignals.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2">Negative</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.algorithmSignals.negativeSignals.map((signal, idx) => (
                          <Badge key={idx} variant="danger" size="sm" className="border-red-500/20 text-[10px]">
                            {signal.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Warnings Card */}
              {analysis.warnings.length > 0 && (
                <Card className="border-red-500/20 bg-red-500/5">
                  <CardContent className="p-4 space-y-3">
                    {analysis.warnings.map((warning, index) => (
                      <div key={index} className="flex items-start gap-3 text-xs">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-zinc-200 font-medium">{warning.message}</p>
                          <p className="text-red-400/70 mt-0.5">
                            Impact: {warning.scoreImpact}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="h-full flex items-center justify-center"
          >
            <div className="text-center space-y-6 max-w-sm px-6">
               <div className="relative inline-block">
                  <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full" />
                  <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-2xl mx-auto">
                    <TrendingUp className="w-8 h-8 text-primary" />
                  </div>
               </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">
                  Ready to Analyze
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Start writing your post to see real-time analysis, engagement predictions, and optimization tips.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="gap-2 border-white/10 hover:bg-white/5 text-zinc-300"
                onClick={() => setGuideOpen(true)}
              >
                <HelpCircle className="w-4 h-4" />
                View Guide
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Generation Modal */}
      <Modal open={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)}>
        <ModalHeader>
          <ModalTitle>AI Post Generator</ModalTitle>
          <ModalClose onClick={() => setIsGenerateModalOpen(false)} />
        </ModalHeader>
        <ModalContent className="space-y-6">
          <Input
            label="Topic"
            placeholder="e.g., The future of AI in 2026..."
            value={generateTopic}
            onChange={(e) => setGenerateTopic(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
             <Select
              label="Style"
              options={STYLE_OPTIONS}
              value={style}
              onChange={(value) => setStyle(value as PostStyle)}
            />

            <Select
              label="Engagement Goal"
              options={ENGAGEMENT_OPTIONS}
              value={targetEngagement}
              onChange={(value) => setTargetEngagement(value as TargetEngagement)}
            />
          </div>

          <div className="space-y-3 p-4 rounded-lg bg-zinc-900/50 border border-white/5">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Constraints
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={generateConstraints.includeHashtags}
                  onChange={(e) =>
                    setGenerateConstraints((prev) => ({
                      ...prev,
                      includeHashtags: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-primary focus:ring-primary/50 transition-colors"
                />
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Include Hashtags</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={generateConstraints.includeEmojis}
                  onChange={(e) =>
                    setGenerateConstraints((prev) => ({
                      ...prev,
                      includeEmojis: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-primary focus:ring-primary/50 transition-colors"
                />
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Include Emojis</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={generateConstraints.includeCTA}
                  onChange={(e) =>
                    setGenerateConstraints((prev) => ({
                      ...prev,
                      includeCTA: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-primary focus:ring-primary/50 transition-colors"
                />
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Include Call-to-Action</span>
              </label>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsGenerateModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={!generateTopic.trim() || isGenerating}
            loading={isGenerating}
            className="w-full sm:w-auto"
          >
            Generate Post
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
