'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal } from '../ui/Modal';
import { Check, ChevronDown, Plus } from 'lucide-react';
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
  const currentSuggestions = activeSubject?.carryRequirements?.length > 0 
    ? activeSubject.carryRequirements 
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
      title="ADD TO BAG"
      mobileFullSheet
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 font-sans">
        
        {/* Subject Selection */}
        <div className="flex flex-col gap-3 pt-2">
          <label className="text-[12px] uppercase tracking-[1.5px] font-bold text-[#6F6F6F]">
            Subject
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between h-[48px] px-4 border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] text-[15px] font-[600] outline-none transition-colors rounded-none cursor-pointer"
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
                <div className="absolute top-[52px] left-0 w-full bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] z-50 shadow-lg max-h-[250px] overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubjectId('');
                      setSelectedItems([]);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#333333] transition-colors border-b border-[#D8D8D8] dark:border-[#333333]"
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
                      className="w-full text-left px-4 py-3 text-[14px] font-medium text-[#111111] dark:text-[#FFFFFF] hover:bg-[#F7F7F5] dark:hover:bg-[#333333] transition-colors border-b border-[#D8D8D8] dark:border-[#333333] last:border-0"
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
          <label className="text-[12px] uppercase tracking-[1.5px] font-bold text-[#6F6F6F]">
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
                      ? 'border-[#111111] dark:border-[#FFFFFF] bg-[#F7F7F5] dark:bg-[#1A1A1A]'
                      : 'border-[#D8D8D8] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF] bg-[#FFFFFF] dark:bg-[#111111]'
                  )}
                >
                  <div className={clsx(
                    'w-[18px] h-[18px] border flex items-center justify-center shrink-0 rounded-none transition-colors',
                    isSelected
                      ? 'bg-[#111111] dark:bg-[#FFFFFF] border-[#111111] dark:border-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111]'
                      : 'border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-transparent'
                  )}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className={clsx(
                    "text-[14px] font-[600] truncate transition-colors",
                    isSelected ? "text-[#111111] dark:text-[#FFFFFF]" : "text-[#6F6F6F] dark:text-[#A0A0A0]"
                  )}>
                    {item}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[#D8D8D8] dark:border-[#333333] my-1" />

        {/* Add Something Else */}
        {!showCustomInput ? (
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="flex items-center gap-2 text-[14px] font-bold text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-all w-fit cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
            <span>Add something else</span>
          </button>
        ) : (
          <div className="animate-in fade-in duration-200">
            <label className="block text-[12px] uppercase tracking-[1.5px] font-bold text-[#6F6F6F] mb-3">
              Item name
            </label>
            <input
              type="text"
              autoFocus
              className="w-full h-[48px] px-4 border border-[#111111] dark:border-[#FFFFFF] bg-[#FFFFFF] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] text-[15px] outline-none transition-colors rounded-none placeholder:text-[#A0A0A0]"
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
            className="w-full h-[48px] bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] font-bold text-[14px] hover:opacity-90 transition-opacity rounded-none disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
