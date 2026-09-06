'use client';

import React from 'react';
import { Modal } from '../ui/Modal';
import { Upload, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';

import { processMultipleFilesForAi } from '@/lib/fileCompressor';
import { validateUploadedFile } from '@/lib/fileSafety';

export interface MessImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (files: { name: string; base64: string; mimeType: string }[] | 'sample') => void;
}

export const MessImportModal: React.FC<MessImportModalProps> = ({ isOpen, onClose, onFileSelect }) => {
  const { showToast } = useApp();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      for (const file of files) {
        const check = validateUploadedFile({ name: file.name, size: file.size, type: file.type });
        if (!check.valid) {
          showToast('Invalid File', check.error || 'Please upload an image or PDF under 5MB.', 'error');
          e.target.value = '';
          return;
        }
      }

      try {
        const results = await processMultipleFilesForAi(files);
        onFileSelect(results);
        onClose();
      } catch (err) {
        showToast('File Error', 'Failed to read files. Please try again.', 'error');
      }
    }
  };

  const handleSample = () => {
    onFileSelect('sample');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Mess Menu"
      description="Upload your mess menu photo(s) or PDF and AI will auto-extract dishes, days & timings."
    >
      <div className="flex flex-col text-center w-full mt-2">
        <div className="relative rounded-none border-2 border-dashed border-black/15 dark:border-white/[0.1] hover:border-black/30 dark:hover:border-white/20 bg-[#F7F7F5]/50 dark:bg-white/[0.02] hover:bg-[#F7F7F5] dark:hover:bg-white/[0.04] transition-all p-8 flex flex-col items-center justify-center mb-6 cursor-pointer group">
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
          />
          <Upload className="w-6 h-6 mb-3 text-black dark:text-[#F4F4F6] group-hover:-translate-y-0.5 transition-transform" />
          <h3 className="text-[15px] font-bold text-black dark:text-[#F4F4F6] mb-1">
            Choose menu file(s)
          </h3>
          <p className="text-[13px] text-black/60 dark:text-[#94A3B8] mb-4">
            Photos or PDF document
          </p>
          
          <div className="px-6 h-[40px] flex items-center justify-center bg-black text-white dark:bg-white dark:text-black font-bold text-[13px] pointer-events-none rounded-none w-fit mx-auto mb-3 shadow-sm">
            Choose file
          </div>

          <div className="text-[11px] text-black/40 dark:text-[#64748B] font-medium tracking-[0.5px] uppercase">
            JPG · PNG · PDF (Multi-Page Supported)
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 text-[9px] font-bold text-black/40 dark:text-white/30 tracking-[2px] uppercase mb-4">
          <span className="flex-1 h-px bg-black/10 dark:bg-white/[0.06]" />
          OR TRY SAMPLE
          <span className="flex-1 h-px bg-black/10 dark:bg-white/[0.06]" />
        </div>

        <button 
          type="button"
          onClick={handleSample}
          className="flex items-center justify-between px-4 w-full h-[44px] rounded-none border border-black/10 dark:border-white/[0.08] bg-[#F7F7F5] dark:bg-[#121317] hover:border-black/20 dark:hover:border-white/[0.14] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 text-[12px] font-bold text-black/70 dark:text-[#94A3B8]">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Use sample Indian mess menu
          </div>
          <span className="text-black/60 dark:text-[#94A3B8] text-[14px]">→</span>
        </button>
      </div>
    </Modal>
  );
};
