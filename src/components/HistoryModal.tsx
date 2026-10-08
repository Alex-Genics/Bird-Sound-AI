import React from 'react';
import { X, Trash2, Clock, CheckCircle2, Volume2, Sparkles, ArrowRight } from 'lucide-react';
import { HistoryItem } from '../types/birdnet';
import { formatTime } from '../utils/audio';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onRemoveHistoryItem: (id: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectHistoryItem,
  onClearHistory,
  onRemoveHistoryItem,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-[#23442e] bg-[#0c1510] shadow-2xl text-[#e3ece5]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1c2e22] px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#10b981]" />
            <h3 className="text-base font-semibold text-[#f1f7f2]">Recording History</h3>
            <span className="text-xs font-mono text-[#769380]">({history.length})</span>
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
          {history.length === 0 ? (
            <div className="py-12 text-center text-[#769380] space-y-2">
              <Volume2 className="mx-auto h-8 w-8 opacity-40 text-[#10b981]" />
              <p className="text-sm">No bird recordings saved yet.</p>
              <p className="text-xs text-[#52705b]">
                Record audio or upload a file to analyze species and save results locally.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#1a2d20] bg-[#0e1912] p-3.5 hover:border-[#10b981]/50 hover:bg-[#122217] transition-colors"
              >
                <button
                  onClick={() => {
                    onSelectHistoryItem(item);
                    onClose();
                  }}
                  className="flex-1 text-left space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#f1f7f2] group-hover:text-[#10b981] transition-colors">
                      {item.topSpecies}
                    </span>
                    <span className="text-[11px] font-serif italic text-[#769380]">
                      {item.scientificName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-[#708c79]">
                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.duration.toFixed(1)}s</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#10b981] font-semibold">
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onSelectHistoryItem(item);
                      onClose();
                    }}
                    className="flex items-center gap-1 rounded-lg bg-[#14261b] border border-[#23442e] px-2.5 py-1.5 text-xs font-medium text-[#d3e5d7] hover:bg-[#10b981] hover:text-black transition-colors"
                  >
                    <span>View</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>

                  <button
                    onClick={() => onRemoveHistoryItem(item.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[#769380] hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    title="Remove from history"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#1c2e22] px-6 py-3 text-xs">
            <span className="text-[#65826f]">Stored securely in local browser storage</span>
            <button
              onClick={onClearHistory}
              className="text-red-400 hover:text-red-300 transition-colors font-medium"
            >
              Clear All History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
