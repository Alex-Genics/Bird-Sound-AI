import React from 'react';
import { X, Sparkles, Play, Volume2, ArrowRight } from 'lucide-react';
import { SampleRecording } from '../types/birdnet';

interface SamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: SampleRecording[];
  onSelectSample: (sample: SampleRecording) => void;
  isAnalyzing: boolean;
}

export const SamplesModal: React.FC<SamplesModalProps> = ({
  isOpen,
  onClose,
  samples,
  onSelectSample,
  isAnalyzing,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-[#23442e] bg-[#0c1510] shadow-2xl text-[#e3ece5]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1c2e22] px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#10b981]" />
            <h3 className="text-base font-semibold text-[#f1f7f2]">
              Authentic Bioacoustic Test Recordings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8ca393] hover:text-[#f1f7f2] hover:bg-[#15241a] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <p className="text-xs text-[#8ca393] mb-2 leading-relaxed">
            Test the live BirdNET neural network with authentic field recordings from global wildlife archives:
          </p>

          {samples.map((sample) => (
            <div
              key={sample.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#1a2d20] bg-[#0e1912] p-4 hover:border-[#10b981]/50 hover:bg-[#122217] transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#f1f7f2]">
                    {sample.common_name}
                  </span>
                  <span className="text-xs font-serif italic text-[#769380]">
                    {sample.species}
                  </span>
                </div>
                <p className="text-xs text-[#9db7a4] leading-normal">
                  {sample.description}
                </p>
                <div className="text-[11px] font-mono text-[#5d7764]">
                  Duration: {sample.duration.toFixed(1)}s · 48,000 Hz WAV
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectSample(sample);
                  onClose();
                }}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-1.5 shrink-0 rounded-lg bg-[#10b981] px-4 py-2 text-xs font-semibold text-black hover:bg-[#34d399] transition-colors disabled:opacity-50"
              >
                <span>Analyze</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-[#1c2e22] px-6 py-3 text-xs text-[#52705b] text-center">
          Audio recordings courtesy of Xeno-canto and Wikimedia Commons bioacoustic archives
        </div>
      </div>
    </div>
  );
};
