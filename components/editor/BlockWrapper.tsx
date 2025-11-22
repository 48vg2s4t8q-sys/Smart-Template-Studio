
import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { BlockStyle } from '../../types';

interface BlockWrapperProps {
  id: string;
  styles?: BlockStyle;
  children: React.ReactNode;
  onDelete: (id: string) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const BlockWrapper: React.FC<BlockWrapperProps> = ({ 
  id, 
  styles, 
  children, 
  onDelete,
  isSelected,
  onSelect
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...styles,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group relative flex items-start mb-4 rounded-md border border-transparent hover:border-indigo-200 hover:bg-gray-50/50 transition-all pl-8 pr-2 py-2",
        isDragging && "opacity-50 z-50 shadow-xl bg-white border-indigo-300",
        isSelected && "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/10"
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect) onSelect();
      }}
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners}
        className="absolute left-1 top-3 p-1 text-gray-400 cursor-grab hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical size={18} />
      </div>

      {/* Content */}
      <div className="flex-grow w-full min-w-0">
        {children}
      </div>

      {/* Actions */}
      <div className="absolute -right-8 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 z-10">
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(id); }}
          className="p-1.5 bg-white shadow-sm border border-gray-200 rounded text-red-500 hover:bg-red-50"
          title="Delete block"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
