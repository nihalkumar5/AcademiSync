'use client';

import React from 'react';
import { Modal } from '../ui/Modal';
import { Upload } from '@/components/ui/icons';
import { useApp } from '@/context/AppContext';

import { processMultipleFilesForAi } from '@/lib/fileCompressor';
import { validateUploadedFile } from '@/lib/fileSafety';

export interface MessImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (files: { name: string; base64: string; mimeType: string }[]) => void;
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Mess Menu"
      description="Upload your mess menu photo(s) or PDF and AI will auto-extract dishes, days & timings."
    >
      <div className="flex flex-col text-center w-full mt-2">
        <div className="relative rounded-none border-2 border-dashed border-line hover:border-black/30 dark:hover:border-white/20 bg-surface-2 hover:bg-surface-2 transition-all p-8 flex flex-col items-center justify-center cursor-pointer group">
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
          />
          <Upload className="w-6 h-6 mb-3 text-fg group-hover:-translate-y-0.5 transition-transform" />
          <h3 className="text-[15px] font-bold text-fg mb-1">
            Choose menu file(s)
          </h3>
          <p className="text-[13px] text-muted mb-4">
            Photos or PDF document
          </p>
          
          <div className="px-6 h-[40px] flex items-center justify-center bg-ink text-on-ink font-bold text-[13px] pointer-events-none rounded-none w-fit mx-auto mb-3 shadow-sm">
            Choose file
          </div>

          <div className="text-[12px] text-faint font-medium ">
            JPG · PNG · PDF (Multi-Page Supported)
          </div>
        </div>
      </div>
    </Modal>
  );
};
