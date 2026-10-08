import React from 'react';
import { X, Cpu, Info, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-[#23442e] bg-[#0c1510] shadow-2xl text-[#e3ece5]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1c2e22] px-6 py-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-[#10b981]" />
            <h3 className="text-base font-semibold text-[#f1f7f2]">
              About BirdVoice AI & BirdNET
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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs text-[#a3bda9] leading-relaxed">
          <section className="space-y-1.5">
            <h4 className="text-sm font-semibold text-[#f1f7f2] flex items-center gap-1.5">
              <span>Bioacoustic Neural Architecture</span>
            </h4>
            <p>
              BirdVoice AI employs the official <strong>BirdNET v2.4</strong> deep convolutional neural network developed jointly by the <strong>Cornell Lab of Ornithology</strong> (K. Lisa Yang Center for Conservation Bioacoustics) and <strong>Chemnitz University of Technology</strong>.
            </p>
          </section>

          <section className="space-y-2 rounded-xl border border-[#1a2d20] bg-[#0e1811] p-3.5 text-[#d3e5d7]">
            <div className="font-semibold text-xs text-[#10b981]">Technical Specifications:</div>
            <ul className="space-y-1 text-[11px] list-disc list-inside text-[#8ca393]">
              <li><strong>Model:</strong> BirdNET V2.4 TFLite with CPU XNNPACK hardware acceleration</li>
              <li><strong>Coverage:</strong> 6,521 avian species across all major terrestrial biomes</li>
              <li><strong>Temporal Resolution:</strong> 3.0-second sliding bioacoustic windows</li>
              <li><strong>Spectrogram Engine:</strong> True Short-Time Fourier Transform (STFT) with Hann windowing (0 – 12 kHz)</li>
              <li><strong>Location Context:</strong> Georeferenced eBird occurrence filter</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className="text-sm font-semibold text-[#f1f7f2]">How Analysis Works</h4>
            <ol className="list-decimal list-inside space-y-1 text-[#8ca393]">
              <li>Incoming audio is standardized to a 48,000 Hz single-channel PCM waveform.</li>
              <li>Audio is sliced into consecutive 3.0-second acoustic frames.</li>
              <li>BirdNET generates acoustic embeddings and predicts softmax species distributions.</li>
              <li>Temporal intervals are clustered to calculate maximum confidence and soundscape richness.</li>
            </ol>
          </section>

          <section className="space-y-1.5 pt-2 border-t border-[#1a2d20]">
            <h4 className="text-xs font-semibold text-[#f1f7f2]">Scientific Attribution</h4>
            <p className="text-[11px] text-[#708c79]">
              BirdNET research is published in <em>Ecological Informatics</em>. Special thanks to the thousands of wildlife sound recordists worldwide contributing to bioacoustic monitoring.
            </p>
          </section>

          <section className="space-y-1.5 pt-2 border-t border-[#1a2d20]">
            <h4 className="text-xs font-semibold text-[#f1f7f2]">Media & Visual Attribution</h4>
            <p className="text-[11px] text-[#708c79]">
              Hummingbird photograph by Jonathan Rodgers,{' '}
              <a
                href="https://commons.wikimedia.org/wiki/File:Hummingbird_hovering_in_flight.jpg"
                target="_blank"
                rel="noreferrer"
                className="text-[#10b981] underline hover:text-[#34d399] inline-flex items-center gap-0.5"
              >
                Wikimedia Commons <ExternalLink className="h-2.5 w-2.5 inline" />
              </a>
              , CC BY-SA 2.5.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-[#1c2e22] px-6 py-3 text-xs text-[#52705b] text-center">
          Powered by Cornell Lab of Ornithology BirdNET · Open Bioacoustics
        </div>
      </div>
    </div>
  );
};
