'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal } from '../ui/Modal';
import { Check, ChevronDown, Plus } from '@/components/ui/icons';
import { clsx } from 'clsx';

export interface AddCustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedSubjectId?: string;
}

const DEFAULT_SUGGESTIONS = [
  'Notebook',
  'Laptop',
  'Charger',
  'ID Card',
  'Calculator',
  'Lab Coat',
];

export const AddCustomItemModal: React.FC<AddCustomItemModalProps> = ({ 
  isOpen, 
  onClose,
  preselectedSubjectId
}) => {
  const { subjects, addCustomCarryItem } = useApp();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedSubjectId(preselectedSubjectId || '');
      setSelectedItems([]);
      setCustomTitle('');
      setShowCustomInput(false);
    }
  }, [isOpen, preselectedSubjectId]);

  const activeSubject = subjects.find(s => s.id === selectedSubjectId);
  const currentSuggestions = (activeSubject?.carryRequirements?.length ?? 0) > 0 
    ? (activeSubject?.carryRequirements || DEFAULT_SUGGESTIONS) 
    : DEFAULT_SUGGESTIONS;

  const toggleSuggestion = (item: string) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCustom = customTitle.trim();
    if (selectedItems.length === 0 && !finalCustom) return;

    selectedItems.forEach((item) => {
      addCustomCarryItem(item, selectedSubjectId || undefined);
    });

    if (finalCustom) {
      addCustomCarryItem(finalCustom, selectedSubjectId || undefined);
    }

    onClose();
  };

  const totalCount = selectedItems.length + (customTitle.trim() ? 1 : 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add to bag"
      mobileFullSheet
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 font-sans">
        
        {/* Subject Selection */}
        <div className="flex flex-col gap-3 pt-2">
          <label className="section-label">
            Subject
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between h-[48px] px-4 border border-line bg-surface text-fg text-[15px] font-[600] outline-none transition-colors rounded-none cursor-pointer"
            >
              <span className="truncate pr-4">
                {activeSubject ? activeSubject.name : 'Select subject'}
              </span>
              <ChevronDown className="w-5 h-5 stroke-[2] shrink-0" />
            </button>
            
            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsDropdownOpen(false)} 
                />
                <div className="absolute top-[52px] left-0 w-full bg-surface border border-line z-50 shadow-2xl max-h-[250px] overflow-y-auto divide-y divide-[#EAEAEA] dark:divide-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubjectId('');
                      setSelectedItems([]);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-[14px] font-medium text-fg hover:bg-surface-2 transition-colors"
                  >
                    Select subject
                  </button>
                  {subjects.map(subject => (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => {
                        setSelectedSubjectId(subject.id);
                        setSelectedItems([]);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-[14px] font-medium text-fg hover:bg-surface-2 transition-colors"
                    >
                      {subject.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Suggestions */}
        <div className="flex flex-col gap-3">
          <label className="section-label">
            What do you need?
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {currentSuggestions.map((item) => {
              const isSelected = selectedItems.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleSuggestion(item)}
                  className={clsx(
                    'flex items-center justify-start gap-3 p-3 border rounded-none transition-colors outline-none cursor-pointer',
                    isSelected
                      ? 'border-line-strong bg-[#F7F7F5] dark:bg-white/[0.08]'
                      : 'border-line hover:border-[#111111] dark:hover:border-white/[0.2] bg-surface'
                  )}
                >
                  <div className={clsx(
                    'w-[18px] h-[18px] border flex items-center justify-center shrink-0 rounded-none transition-colors',
                    isSelected
                      ? 'bg-ink border-line-strong text-on-ink'
                      : 'border-[#D9D9D6] dark:border-white/[0.15] bg-[#FFFFFF] dark:bg-transparent'
                  )}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className={clsx(
                    "text-[14px] font-[600] truncate transition-colors",
                    isSelected ? "text-fg" : "text-muted"
                  )}>
                    {item}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-line my-1" />

        {/* Add Something Else */}
        {!showCustomInput ? (
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="flex items-center gap-2 text-[14px] font-bold text-muted hover:text-fg transition-all w-fit cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
            <span>Add something else</span>
          </button>
        ) : (
          <div className="animate-in fade-in duration-200">
            <label className="block text-[12px] font-bold text-muted mb-3">
              Item name
            </label>
            <input
              type="text"
              autoFocus
              className="w-full h-[48px] px-4 border border-line-strong bg-surface text-fg text-[15px] outline-none transition-colors rounded-none placeholder:text-[#A0A0A0] dark:placeholder:text-[#71717A]"
              placeholder="e.g. Scientific Calculator"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          </div>
        )}

        <div className="mt-2">
          <button 
            type="submit" 
            disabled={totalCount === 0}
            className="btn btn-primary w-full disabled:cursor-not-allowed"
          >
            {totalCount <= 1 
              ? 'Add to Bag' 
              : `Add ${totalCount} items`}
          </button>
        </div>
      </form>
    </Modal>
  );
};
