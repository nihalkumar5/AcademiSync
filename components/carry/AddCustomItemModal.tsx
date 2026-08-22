'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export interface AddCustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddCustomItemModal: React.FC<AddCustomItemModalProps> = ({ isOpen, onClose }) => {
  const { addCustomCarryItem } = useApp();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addCustomCarryItem(title.trim(), undefined, note.trim() || undefined);
    setTitle('');
    setNote('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Item to Bag"
      description="Include special gear, calculators, lab coats, drawing tools, or files to carry tomorrow."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left font-sans">
        <Input
          label="Item Name"
          placeholder="e.g. Scientific Calculator, Lab Journal, A3 Sheet"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        <Input
          label="Note / Class Reminder (Optional)"
          placeholder="e.g. Needed for Physics Lab in Block 3"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFEAE2] dark:border-[#282624]">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" className="bg-[#8C6B5D] hover:bg-[#785B4E] text-white">
            Add to Bag
          </Button>
        </div>
      </form>
    </Modal>
  );
};
