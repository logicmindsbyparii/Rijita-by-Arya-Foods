import React, { useState, useRef } from "react";
import Image from "next/image";
import { ImagePlus, XCircle, CheckCircle2, UploadCloud } from "lucide-react";
import { cn, getImageUrl } from "@/lib/utils";

interface ImageUploaderProps {
  label?: string;
  previewUrl?: string;
  file?: File | null;
  onChange: (file: File) => void;
  onRemove: () => void;
  accept?: string;
  className?: string;
  previewClassName?: string;
}

export function ImageUploader({
  label = "Upload Image",
  previewUrl,
  file,
  onChange,
  onRemove,
  accept = "image/*",
  className,
  previewClassName = "h-20 w-20",
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onChange(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onChange(e.target.files[0]);
    }
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Preview Area */}
      <div 
        className={cn(
          "rounded-2xl border-2 border-dashed overflow-hidden shrink-0 bg-white flex items-center justify-center transition-colors",
          isDragging ? "border-brand-500 bg-brand-50/50" : "border-border",
          previewClassName
        )}
      >
        {previewUrl ? (
          <Image 
            src={getImageUrl(previewUrl)} 
            alt="Preview" 
            width={120} 
            height={120} 
            className="h-full w-full object-contain p-2" 
            unoptimized 
          />
        ) : (
          <ImagePlus className="h-8 w-8 text-muted-foreground/30" />
        )}
      </div>

      {/* Upload Controls */}
      <div className="flex-1">
        <div 
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl border border-dashed hover:border-brand-500 cursor-pointer transition-colors bg-background w-full text-center group",
            isDragging ? "border-brand-500 bg-brand-50/30" : "border-border"
          )}
        >
          <div className="flex items-center gap-2">
            <UploadCloud className={cn("h-4 w-4 transition-colors", isDragging ? "text-brand-600" : "text-muted-foreground group-hover:text-brand-500")} />
            <span className={cn("text-sm transition-colors", isDragging ? "text-brand-600 font-medium" : "text-muted-foreground group-hover:text-foreground")}>
              {file ? file.name : label}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground/70">Click or drag & drop</span>
          <input 
            ref={fileInputRef}
            type="file" 
            accept={accept} 
            className="hidden" 
            onChange={handleFileChange} 
            onClick={(e) => { (e.target as HTMLInputElement).value = "" }} 
          />
        </div>

        {/* Status & Actions */}
        <div className="mt-2 flex items-center justify-between px-2">
          {previewUrl && !file ? (
            <p className="text-[10px] text-green-600 flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" /> Current
            </p>
          ) : <div />}

          {(file || previewUrl) && (
            <button 
              onClick={(e) => { e.preventDefault(); onRemove(); }}
              className="text-[10px] text-red-500 flex items-center gap-2 hover:underline hover:text-red-600 transition-colors"
            >
              <XCircle className="h-4 w-4" /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
