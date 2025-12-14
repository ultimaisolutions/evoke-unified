import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Film, Image, X, FileVideo, FileImage } from 'lucide-react';
import { cn, formatFileSize, isVideoFile, isImageFile } from '../../lib/utils';

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],
};

export function FileDropzone({ onFileSelect, disabled = false, selectedFile = null, onClear }) {
  const [preview, setPreview] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Create preview for images
    if (isImageFile(file)) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    onFileSelect(file);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    disabled,
  });

  const handleClear = (e) => {
    e.stopPropagation();
    setPreview(null);
    onClear?.();
  };

  const FileIcon = selectedFile && isVideoFile(selectedFile) ? FileVideo : FileImage;

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative group cursor-pointer',
        'border-2 border-dashed rounded-2xl',
        'transition-all duration-300 ease-out',
        'min-h-[300px] flex flex-col items-center justify-center p-8',
        disabled && 'opacity-50 cursor-not-allowed',
        isDragActive && !isDragReject && 'border-purple-500 bg-purple-500/10 scale-[1.02]',
        isDragReject && 'border-red-500 bg-red-500/10',
        !isDragActive && !selectedFile && 'border-border hover:border-purple-500/50 hover:bg-purple-500/5',
        selectedFile && 'border-purple-500/50 bg-purple-500/5'
      )}
    >
      <input {...getInputProps()} />

      {/* Background decoration */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      {selectedFile ? (
        /* File Selected State */
        <div className="relative z-10 text-center space-y-4 animate-fade-in">
          {preview ? (
            <div className="relative mx-auto w-48 h-48 rounded-xl overflow-hidden shadow-lg shadow-purple-500/20">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          ) : (
            <div className="mx-auto w-20 h-20 rounded-2xl bg-purple-500/20 flex items-center justify-center">
              <FileIcon className="w-10 h-10 text-purple-400" />
            </div>
          )}

          <div className="space-y-1">
            <p className="font-medium text-foreground truncate max-w-xs mx-auto">
              {selectedFile.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(selectedFile.size)}
              {isVideoFile(selectedFile) && ' • Video'}
              {isImageFile(selectedFile) && ' • Image'}
            </p>
          </div>

          {onClear && !disabled && (
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
              Choose different file
            </button>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="relative z-10 text-center space-y-4">
          <div className={cn(
            'mx-auto w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300',
            isDragActive ? 'bg-purple-500/30 scale-110' : 'bg-purple-500/20 group-hover:bg-purple-500/30'
          )}>
            <Upload className={cn(
              'w-10 h-10 transition-all duration-300',
              isDragActive ? 'text-purple-300 scale-110' : 'text-purple-400'
            )} />
          </div>

          <div className="space-y-2">
            <p className="text-lg font-display font-semibold text-foreground">
              {isDragActive ? 'Drop your file here' : 'Upload Advertisement'}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Drag & drop an image or video, or click to browse.
              <br />
              Supports JPG, PNG, GIF, WebP, MP4, MOV, WebM
            </p>
          </div>

          <div className="flex items-center justify-center gap-6 pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Image className="w-4 h-4" />
              <span>Images</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Film className="w-4 h-4" />
              <span>Videos</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FileDropzone;
