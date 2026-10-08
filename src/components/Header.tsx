import React from 'react';
import { Volume2, History, Sparkles, HelpCircle, Radio } from 'lucide-react';

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenSamples: () => void;
  onOpenAbout: () => void;
  historyCount: number;
  isAnalyzing: boolean;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  onOpenSamples,
  onOpenAbout,
  historyCount,
  isAnalyzing,
  onReset,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1c2e22] bg-[#0b100d]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <button
          onClick={onReset}
          className="group flex items-center gap-3 text-left transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#16271c] border border-[#23442e] text-[#10b981] group-hover:border-[#10b981]/60 transition-colors">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-[#f1f7f2]">
                BirdVoice AI
              </span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#10b981]">
                BirdNET v2.4
              </span>
            </div>
            <p className="text-xs text-[#708c79]">
              Bioacoustic avian vocalization identification
            </p>
          </div>
        </button>

        {/* Status & Navigation Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status Indicator */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-[#8ca393] pr-3 border-r border-[#1c2e22]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
            <span>6,521 species catalog</span>
            <span aria-hidden="true">·</span>
            <span>Neural STFT</span>
          </div>

          {/* Sample library action */}
          <button
            onClick={onOpenSamples}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 rounded-lg border border-[#23442e] bg-[#122017] px-3 py-1.5 text-xs font-medium text-[#d3e5d7] hover:bg-[#1a2e21] hover:text-[#f1f7f2] transition-colors disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#10b981]" />
            <span className="hidden sm:inline">Try Audio</span> Samples
          </button>

          {/* History action */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 rounded-lg border border-[#23442e] bg-[#122017] px-3 py-1.5 text-xs font-medium text-[#d3e5d7] hover:bg-[#1a2e21] hover:text-[#f1f7f2] transition-colors"
          >
            <History className="h-3.5 w-3.5 text-[#8ca393]" />
            <span>History</span>
            {historyCount > 0 && (
              <span className="text-[10px] font-mono text-[#10b981]">
                ({historyCount})
              </span>
            )}
          </button>

          {/* About / Specs action */}
          <button
            onClick={onOpenAbout}
            aria-label="Model specifications and about"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#23442e] bg-[#122017] text-[#8ca393] hover:text-[#f1f7f2] hover:bg-[#1a2e21] transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
