'use client';

import { AiUploadPanel } from '@/components/ai/AiScan';
import React from 'react';
import { Modal } from '../ui/Modal';
import { Upload } from '@/components/ui/icons';
import { useApp } from '@/context/AppContext';

import { AiUploadError, prepareAiUpload } from '@/lib/fileCompressor';

export interface MessImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (files: { name: string; base64: string; mimeType: string }[]) => void;
}

export const MessImportModal: React.FC<MessImportModalProps> = ({ isOpen, onClose, onFileSelect }) => {
  const { showToast } = useApp();

  const startScan = async (files: File[]) => {
    try {
      // Photos are shrunk on the phone; everything together stays under the upload limit
      const results = await prepareAiUpload(files, { maxDim: 1800 });
      onFileSelect(results);
      onClose();
    } catch (err) {
      showToast("Can't send these files", err instanceof AiUploadError ? err.message : 'Failed to read files. Please try again.', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import mess menu">
      <AiUploadPanel kind="mess" onScan={startScan} />
    </Modal>
  );
};
