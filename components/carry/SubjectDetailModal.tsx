'use client';

import React from 'react';
import { Modal } from '../ui/Modal';
import { useApp } from '@/context/AppContext';
import { ClassSession } from '@/lib/types';
import { CarryItemRow } from './CarryItemRow';
import { Backpack, Plus, MapPin, Clock } from 'lucide-react';

export interface SubjectDetailModalProps {
  session: ClassSession | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAdd: () => void;
}

export const SubjectDetailModal: React.FC<SubjectDetailModalProps> = ({
  session,
  isOpen,
  onClose,
  onOpenAdd,
}) => {
  const { subjects, carryItems, toggleCarryItemPacked, deleteCarryItem } = useApp();

  if (!session) return null;

  const subject = subjects.find(s => s.id === session.subjectId);
  const visibleCarryItems = carryItems.filter(i => !i.isHidden && i.subjectId === session.subjectId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} mobileFullSheet>
      <div className="flex flex-col font-sans">
        
        {/* Header */}
        <div className="flex flex-col gap-3 pb-6 border-b border-[#D8D8D8] dark:border-[#333333]">
          <h2 className="text-[20px] font-bold text-[#111111] dark:text-[#FFFFFF] uppercase tracking-wide leading-tight">
            {subject?.name || 'Unknown Subject'}
          </h2>
          
          <div className="flex flex-col gap-1.5 text-[14px] text-[#6F6F6F]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{session.startTime} — {session.endTime}</span>
            </div>
            {session.room && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>Room {session.room}</span>
              </div>
            )}
          </div>
        </div>

        {/* Packing List */}
        <div className="pt-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[12px] uppercase tracking-[1.5px] font-bold text-[#111111] dark:text-[#FFFFFF]">
            <Backpack className="w-[18px] h-[18px] stroke-[1.5]" />
            <span>Things to Carry</span>
          </div>

          {visibleCarryItems.length === 0 ? (
            <div className="text-[14px] text-[#6F6F6F] py-2">
              No items specified for this class.
            </div>
          ) : (
            <div className="flex flex-col gap-1 mt-2">
              {visibleCarryItems.map(item => (
                <CarryItemRow
                  key={item.id}
                  item={item}
                  onToggle={toggleCarryItemPacked}
                  onDelete={deleteCarryItem}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => {
              onOpenAdd();
            }}
            className="flex items-center gap-2 text-[14px] font-bold text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-all w-fit cursor-pointer mt-4"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
            <span>Add item</span>
          </button>
        </div>

      </div>
    </Modal>
  );
};
