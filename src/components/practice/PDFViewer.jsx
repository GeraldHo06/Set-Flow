import React, { useState } from 'react';
import { FileText, Upload, Maximize2, X, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';

export default function PDFViewer({ scoreUrl, onUploadScore, onRemoveScore }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFile = async (file) => {
    if (!file || !file.type.includes('pdf')) return;
    setIsUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('score-files')
        .upload(fileName, file, { contentType: 'application/pdf', upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('score-files')
        .getPublicUrl(data.path);

      onUploadScore(publicUrl);
    } catch (err) {
      console.error('PDF upload error:', err);
      alert('Failed to upload PDF: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    await uploadFile(e.target.files?.[0]);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    await uploadFile(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  if (!scoreUrl) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full min-h-[400px] rounded-xl border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-primary/60 bg-primary/5'
            : 'border-border/50 bg-secondary/30'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-primary/20' : 'bg-secondary'}`}>
          <FileText className={`w-7 h-7 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          {isDragging ? 'Drop PDF here' : 'No score uploaded'}
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          {isDragging ? 'Release to upload' : 'Drag & drop or upload a PDF'}
        </p>
        <label className="cursor-pointer">
          <Button variant="outline" size="sm" className="gap-2" disabled={isUploading} asChild>
            <span>
              <Upload className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Upload PDF'}
            </span>
          </Button>
          <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>
    );
  }

  const viewerContent = (
    <iframe
      src={`${scoreUrl}#toolbar=0&navpanes=0`}
      className="w-full h-full pdf-viewer-frame bg-white rounded-lg"
      title="Sheet Music"
    />
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="text-sm font-medium">Sheet Music</span>
          <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 p-4">
          {viewerContent}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full rounded-xl transition-colors ${isDragging ? 'ring-2 ring-primary/60' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Score
          {isDragging && <span className="text-[10px] text-primary font-normal">Drop to replace</span>}
        </h3>
        <div className="flex items-center gap-1">
          {/* Remove PDF button */}
          {onRemoveScore && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs h-7 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm('Remove this score?')) onRemoveScore();
              }}
            >
              <Trash2 className="w-3 h-3" />
              Remove
            </Button>
          )}
          <label className="cursor-pointer">
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isUploading} asChild>
              <span title="Upload PDF">
                {isUploading ? <span className="text-[9px]">...</span> : <Upload className="w-3.5 h-3.5" />}
              </span>
            </Button>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
          </label>
          <a href={scoreUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Open PDF in new tab">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsFullscreen(true)}>
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-[300px] rounded-xl overflow-hidden border border-border/50">
        {viewerContent}
      </div>
    </div>
  );
}