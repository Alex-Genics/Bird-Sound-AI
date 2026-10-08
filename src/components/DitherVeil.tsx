import React, { useEffect, useRef, useState, useCallback } from 'react';

export interface DitherVeilProps {
  /** Source image URL (supports PNG / WebP with transparency) */
  src: string;
  /** Dithering algorithm pattern */
  pattern?: 'floyd' | 'bayer' | 'noise';
  /** Size of each dithered pixel block (1 to 4) */
  pixelSize?: number;
  /** Primary dark/ink color for dither dots */
  inkColor?: string;
  /** Paper/background or light highlight color */
  paperColor?: string;
  /** Radius of hover reveal effect in pixels */
  revealRadius?: number;
  /** Softness of the reveal edge (0 to 1) */
  softness?: number;
  /** Milliseconds the reveal linger effect lasts */
  linger?: number;
  /** Whether clicks trigger a localized radial dither burst */
  clickBurst?: boolean;
  /** Dither blend ratio: 0 = 100% photorealistic, 1 = 100% dithered */
  ditherRatio?: number;
  /** Optional audio amplitude (0 to 1) to dynamically modulate dither */
  audioLevel?: number;
  /** Class name for the container */
  className?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Image dimensions */
  width?: number;
  height?: number;
  /** Whether mouse/hover interactions are active */
  interactive?: boolean;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  startTime: number;
}

export const DitherVeil: React.FC<DitherVeilProps> = ({
  src,
  pattern = 'floyd',
  pixelSize = 2,
  inkColor = '#062817',
  paperColor = '#6ee7b7',
  revealRadius = 80,
  softness = 0.5,
  linger = 400,
  clickBurst = true,
  ditherRatio = 0,
  audioLevel = 0,
  className = '',
  alt = 'Hummingbird',
  width,
  height,
  interactive = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Cached image elements and dithered buffers
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const ditherCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const pointerRef = useRef<{ x: number; y: number; active: boolean; lastMoved: number }>({
    x: -1000,
    y: -1000,
    active: false,
    lastMoved: 0,
  });

  // Pre-generate the dithered version on an offscreen canvas
  const processDither = useCallback(
    (img: HTMLImageElement) => {
      const offscreen = document.createElement('canvas');
      const w = img.naturalWidth || img.width || 400;
      const h = img.naturalHeight || img.height || 300;
      offscreen.width = w;
      offscreen.height = h;

      const ctx = offscreen.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Extract ink and paper RGB
      const parseHexOrRgb = (c: string, defaultRgb: [number, number, number]): [number, number, number] => {
        if (c.startsWith('#')) {
          const hex = c.replace('#', '');
          if (hex.length === 6) {
            return [
              parseInt(hex.substring(0, 2), 16),
              parseInt(hex.substring(2, 4), 16),
              parseInt(hex.substring(4, 6), 16),
            ];
          }
          if (hex.length === 3) {
            return [
              parseInt(hex[0] + hex[0], 16),
              parseInt(hex[1] + hex[1], 16),
              parseInt(hex[2] + hex[2], 16),
            ];
          }
        }
        return defaultRgb;
      };

      const inkRGB = parseHexOrRgb(inkColor, [6, 40, 23]);
      const paperRGB = parseHexOrRgb(paperColor, [110, 231, 183]);

      if (pattern === 'floyd') {
        // Floyd-Steinberg error diffusion with transparency preservation
        const lum = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) {
          const idx = i * 4;
          const a = data[idx + 3];
          if (a > 20) {
            lum[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          } else {
            lum[i] = -1; // transparent flag
          }
        }

        for (let y = 0; y < h; y += pixelSize) {
          for (let x = 0; x < w; x += pixelSize) {
            const idx = y * w + x;
            const current = lum[idx];
            if (current < 0) continue;

            const threshold = 128;
            const isLight = current > threshold;
            const targetColor = isLight ? paperRGB : inkRGB;
            const error = current - (isLight ? 255 : 0);

            // Stamp pixelSize block
            for (let dy = 0; dy < pixelSize && y + dy < h; dy++) {
              for (let dx = 0; dx < pixelSize && x + dx < w; dx++) {
                const pIdx = ((y + dy) * w + (x + dx)) * 4;
                if (data[pIdx + 3] > 20) {
                  data[pIdx] = targetColor[0];
                  data[pIdx + 1] = targetColor[1];
                  data[pIdx + 2] = targetColor[2];
                }
              }
            }

            // Distribute error to neighbors
            const distribute = (nx: number, ny: number, weight: number) => {
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nIdx = ny * w + nx;
                if (lum[nIdx] >= 0) {
                  lum[nIdx] += error * weight;
                }
              }
            };

            distribute(x + pixelSize, y, 7 / 16);
            distribute(x - pixelSize, y + pixelSize, 3 / 16);
            distribute(x, y + pixelSize, 5 / 16);
            distribute(x + pixelSize, y + pixelSize, 1 / 16);
          }
        }
      } else {
        // Bayer 4x4 ordered dithering
        const bayerMatrix = [
          [0, 8, 2, 10],
          [12, 4, 14, 6],
          [3, 11, 1, 9],
          [15, 7, 13, 5],
        ];

        for (let y = 0; y < h; y += pixelSize) {
          for (let x = 0; x < w; x += pixelSize) {
            const idx = (y * w + x) * 4;
            const a = data[idx + 3];
            if (a <= 20) continue;

            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            const threshold = ((bayerMatrix[(y / pixelSize) % 4][(x / pixelSize) % 4] + 0.5) / 16) * 255;
            const isLight = gray > threshold;
            const targetColor = isLight ? paperRGB : inkRGB;

            for (let dy = 0; dy < pixelSize && y + dy < h; dy++) {
              for (let dx = 0; dx < pixelSize && x + dx < w; dx++) {
                const pIdx = ((y + dy) * w + (x + dx)) * 4;
                if (data[pIdx + 3] > 20) {
                  data[pIdx] = targetColor[0];
                  data[pIdx + 1] = targetColor[1];
                  data[pIdx + 2] = targetColor[2];
                }
              }
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return offscreen;
    },
    [pixelSize, pattern, inkColor, paperColor]
  );

  // Load and precompute
  useEffect(() => {
    let isCancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (isCancelled) return;
      originalImgRef.current = img;
      const ditherCanvas = processDither(img);
      ditherCanvasRef.current = ditherCanvas;
      setImageLoaded(true);
      setHasError(false);
    };

    img.onerror = () => {
      if (isCancelled) return;
      setHasError(true);
      setImageLoaded(false);
    };

    img.src = src;

    return () => {
      isCancelled = true;
    };
  }, [src, processDither]);

  // Main rendering loop with interactive reveal and click bursts
  useEffect(() => {
    if (!imageLoaded || hasError) return;

    const canvas = canvasRef.current;
    const originalImg = originalImgRef.current;
    const ditherCanvas = ditherCanvasRef.current;
    if (!canvas || !originalImg || !ditherCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const now = performance.now();
      const rect = canvas.getBoundingClientRect();
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Base layer: render photorealistic image
      ctx.globalAlpha = 1;
      ctx.drawImage(originalImg, 0, 0, w, h);

      // Effective dither factor (base ratio + dynamic audio modulation)
      const effectiveDither = Math.min(1, Math.max(0, ditherRatio + audioLevel * 0.35));

      // If global ditherRatio > 0, blend dither layer
      if (effectiveDither > 0.01) {
        ctx.globalAlpha = effectiveDither;
        ctx.drawImage(ditherCanvas, 0, 0, w, h);
      }

      // Interactive hover reveal mask
      const pointer = pointerRef.current;
      const isHoverLingering = now - pointer.lastMoved < linger;

      if (interactive && (pointer.active || isHoverLingering)) {
        const factor = isHoverLingering ? Math.max(0, 1 - (now - pointer.lastMoved) / linger) : 1;
        const rad = revealRadius * factor;

        if (rad > 4) {
          // Create offscreen clipping mask for local dither reveal
          ctx.save();
          ctx.beginPath();
          ctx.arc(pointer.x, pointer.y, rad, 0, Math.PI * 2);
          ctx.clip();
          ctx.globalAlpha = (0.5 + 0.5 * softness) * factor;
          ctx.drawImage(ditherCanvas, 0, 0, w, h);
          ctx.restore();
        }
      }

      // Render expanding click burst ripples
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        const elapsed = now - ripple.startTime;
        const progress = Math.min(1, elapsed / 600);

        if (progress >= 1) {
          ripples.splice(i, 1);
          continue;
        }

        const currentRadius = ripple.radius + (ripple.maxRadius - ripple.radius) * Math.sin((progress * Math.PI) / 2);
        const alpha = (1 - progress) * ripple.opacity;

        ctx.save();
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, currentRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = alpha;
        ctx.drawImage(ditherCanvas, 0, 0, w, h);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [imageLoaded, hasError, ditherRatio, audioLevel, revealRadius, softness, linger, interactive]);

  // Mouse / Pointer handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    pointerRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      active: true,
      lastMoved: performance.now(),
    };
  };

  const handlePointerLeave = () => {
    pointerRef.current.active = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clickBurst || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const maxRadius = Math.max(canvasRef.current.width, canvasRef.current.height) * 0.9;

    ripplesRef.current.push({
      x,
      y,
      radius: 10,
      maxRadius,
      opacity: 0.85,
      startTime: performance.now(),
    });
  };

  if (hasError) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img src={src} alt={alt} className="w-full h-auto object-contain" />
      </div>
    );
  }

  const naturalW = originalImgRef.current?.naturalWidth || 876;
  const naturalH = originalImgRef.current?.naturalHeight || 661;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      className={`relative inline-block select-none ${className}`}
      style={{
        aspectRatio: `${naturalW} / ${naturalH}`,
      }}
    >
      <canvas
        ref={canvasRef}
        width={naturalW}
        height={naturalH}
        className="w-full h-full block object-contain pointer-events-none"
        aria-hidden="true"
      />
      {/* Invisible screen-reader image for accessibility */}
      <img
        src={src}
        alt={alt}
        className="sr-only"
        width={width}
        height={height}
      />
    </div>
  );
};

export default DitherVeil;
