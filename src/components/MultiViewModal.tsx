// Multi-View Photogrammetry & Feature Correspondence Matching Modal

import React, { useRef, useEffect } from 'react';
import { X, Images, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { MultiViewResult } from '../types';

interface MultiViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: MultiViewResult | null;
  img1Element: HTMLImageElement | HTMLCanvasElement | null;
  img2Element: HTMLImageElement | HTMLCanvasElement | null;
}

export const MultiViewModal: React.FC<MultiViewModalProps> = ({
  isOpen,
  onClose,
  result,
  img1Element,
  img2Element,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen || !canvasRef.current || !img1Element || !img2Element || !result) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 400;
    const h = 260;
    canvas.width = w * 2 + 10;
    canvas.height = h;

    ctx.fillStyle = '#090D13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw images side by side
    ctx.drawImage(img1Element, 0, 0, w, h);
    ctx.drawImage(img2Element, w + 10, 0, w, h);

    // Draw correspondence lines
    const matches = result.matches;
    const scaleX = w / 320;
    const scaleY = h / 240;

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const x1 = m.p1.x * scaleX;
      const y1 = m.p1.y * scaleY;
      const x2 = w + 10 + m.p2.x * scaleX;
      const y2 = m.p2.y * scaleY;

      // Color based on index gradient
      const hue = (i * 137.5) % 360;
      ctx.strokeStyle = `hsla(${hue}, 85%, 60%, 0.75)`;
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw feature circles
      ctx.fillStyle = `hsl(${hue}, 90%, 65%)`;
      ctx.beginPath();
      ctx.arc(x1, y1, 2.5, 0, Math.PI * 2);
      ctx.arc(x2, y2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [isOpen, result, img1Element, img2Element]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-fadeIn">
      <div className="bg-studio-panel border border-studio-border rounded-lg max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-studio-border flex items-center justify-between bg-studio-bg/60">
          <div className="flex items-center space-x-2">
            <Images className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-100 font-mono tracking-wide">
              MULTI-VIEW CORRESPONDENCE & PHOTOGRAMMETRIC TRIANGULATION
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-studio-panelHover text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-300">
          {/* Matches Canvas */}
          <div className="w-full bg-studio-bg border border-studio-border rounded-lg p-2 flex items-center justify-center overflow-x-auto">
            <canvas ref={canvasRef} className="max-w-full h-auto rounded" />
          </div>

          {/* Status Alert */}
          {result && (
            <div
              className={`p-3 rounded border flex items-start space-x-2.5 ${
                result.status === 'calibrated'
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : 'bg-amber-950/20 border-amber-800/40 text-amber-300'
              }`}
            >
              {result.status === 'calibrated' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
              )}
              <div className="space-y-1">
                <div className="font-semibold text-xs">
                  {result.status === 'calibrated'
                    ? 'Photogrammetric Feature Correspondence Confirmed'
                    : 'Photogrammetric Triangulation Constraints'}
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">{result.statusExplanation}</p>
              </div>
            </div>
          )}

          {/* Academic Photogrammetry Explanation */}
          <div className="bg-studio-bg border border-studio-border rounded p-3 space-y-1.5 text-[10px] text-slate-400">
            <div className="flex items-center space-x-1.5 text-blue-400 font-medium">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Academic Photogrammetry Pipeline Note</span>
            </div>
            <p className="leading-relaxed">
              True multi-view 3D reconstruction requires calibrated pinhole camera optics, translational baseline movement (translation vector t != 0), and bundle adjustment over epipolar lines. If viewpoints share insufficient baseline or lack translational parallax, triangulation cannot resolve depth ambiguity.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-studio-border bg-studio-bg/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-studio-panelHover hover:bg-studio-border text-slate-200 text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
