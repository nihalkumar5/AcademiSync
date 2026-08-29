'use client';

import React from 'react';
import { Modal } from '../ui/Modal';
import { Upload, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export interface MessImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: File | 'sample') => void;
}

export const MessImportModal: React.FC<MessImportModalProps> = ({ isOpen, onClose, onFileSelect }) => {
  const { showToast } = useApp();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const file = files[0];
      const MAX_SIZE_MB = 3;
      const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
      
      if (file.size > MAX_SIZE_BYTES) {
        showToast('File too large', 'Please select an image under 3MB to ensure the AI can process it.', 'error');
        return;
      }
      
      onFileSelect(file);
      onClose();
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
      title="Import Menu"
      description="Upload a photo of your mess menu and we'll extract the meals and days."
    >
      <div className="flex flex-col text-center w-full mt-2">
        <div className="relative border border-dashed border-[#EAEAEA] dark:border-[#333333] hover:border-[#D9D9D6] dark:hover:border-[#666666] transition-colors p-8 flex flex-col items-center justify-center mb-6 bg-[#FFFFFF] dark:bg-[#111111]">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
          />
          <Upload className="w-5 h-5 mb-3 text-[#111111] dark:text-[#FFFFFF]" />
          <h3 className="text-[15px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-1">
            Choose a menu file
          </h3>
          <p className="text-[13px] text-[#6F6F6F] mb-4">
            Photo (JPG, PNG)
          </p>
          
          <div className="px-6 h-[44px] flex items-center justify-center bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111] font-bold text-[13px] pointer-events-none rounded-none w-fit mx-auto mb-3">
            Choose file
          </div>

          <div className="text-[11px] text-[#999999] font-medium tracking-[0.5px] uppercase">
            JPG · PNG
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 text-[9px] font-bold text-[#A0A0A0] tracking-[2px] uppercase mb-4">
          <span className="flex-1 h-px bg-[#EAEAEA] dark:bg-[#222222]" />
          OR TRY SAMPLE
          <span className="flex-1 h-px bg-[#EAEAEA] dark:bg-[#222222]" />
        </div>

        <button 
          type="button"
          onClick={handleSample}
          className="flex items-center justify-between px-4 w-full h-[40px] border border-[#EAEAEA] dark:border-[#222222] hover:border-[#D9D9D6] dark:hover:border-[#333333] hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 text-[12px] font-bold text-[#6F6F6F] dark:text-[#999999]">
            <Sparkles className="w-3.5 h-3.5" />
            Use sample menu
          </div>
          <span className="text-[#6F6F6F] dark:text-[#999999] text-[14px]">→</span>
        </button>
      </div>
    </Modal>
  );
};
