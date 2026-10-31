import React, { useRef, useState } from 'react';
import { FileImage, Film, AlertCircle } from 'lucide-react';
import { FileMetadata } from '../types';
import { validateAndDetectFormat, extractFileMetadata as extractMeta } from '../utils/formatDetection';

interface FileUploaderProps {
  acceptedFormats: ('png' | 'jpg' | 'jpeg' | 'mp4')[];
  onFileLoaded: (metadata: FileMetadata, file: File) => void;
  title?: string;
  description?: string;
  currentMetadata?: FileMetadata | null;
  onLoadSample?: () => void;
  sampleLabel?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  acceptedFormats,
  onFileLoaded,
  title = 'Upload Media File',
  description = 'Drag & drop or browse PNG, JPG, JPEG, or MP4',
  currentMetadata,
  onLoadSample,
  sampleLabel = 'Load Sample',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptString = acceptedFormats
    .map((fmt) => (fmt === 'mp4' ? 'video/mp4' : `image/${fmt === 'jpg' ? 'jpeg' : fmt}`))
    .join(',');

  const handleProcessFile = async (file: File) => {
    setErrorMsg(null);
    setIsLoading(true);

    const validation = validateAndDetectFormat(file);
    if (!validation.isValid || !validation.format) {
      setErrorMsg(validation.errorMessage || 'Unsupported file format.');
      setIsLoading(false);
      return;
    }

    if (!acceptedFormats.includes(validation.format as any)) {
      setErrorMsg(`Format .${validation.format.toUpperCase()} is not accepted in this workspace.`);
      setIsLoading(false);
      return;
    }

    try {
      const meta = await extractMeta(file);
      onFileLoaded(meta, file);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to decode file.');
    } finally {
      setIsLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleProcessFile(files[0]);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleProcessFile(files[0]);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Drag & Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/20'
            : 'border-studio-border bg-studio-bg hover:border-slate-500 hover:bg-studio-panelHover'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptString}
          className="hidden"
          onChange={onFileInputChange}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            {acceptedFormats.includes('mp4') ? (
              <Film className="w-5 h-5 text-cyan-400" />
            ) : (
              <FileImage className="w-5 h-5 text-blue-400" />
            )}
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-200">
              {isLoading ? 'Processing file metadata...' : title}
            </div>
            <div className="text-[10px] text-studio-dim mt-0.5">{description}</div>
          </div>

          <div className="flex items-center space-x-1.5 pt-1">
            {acceptedFormats.map((fmt) => (
              <span
                key={fmt}
                className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium uppercase bg-slate-800 text-slate-300 border border-slate-700"
              >
                .{fmt}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-2.5 rounded bg-red-950/30 border border-red-800/60 text-red-300 text-[11px] flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
          <span className="leading-tight">{errorMsg}</span>
        </div>
      )}

      {/* Sample Preset Loader & Current File Info */}
      <div className="flex items-center justify-between">
        {onLoadSample && (
          <button
            type="button"
            onClick={onLoadSample}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-2 flex items-center space-x-1"
          >
            <span>{sampleLabel}</span>
          </button>
        )}

        {currentMetadata && (
          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[220px]">
            {currentMetadata.name} ({currentMetadata.width}×{currentMetadata.height})
          </div>
        )}
      </div>
    </div>
  );
};
