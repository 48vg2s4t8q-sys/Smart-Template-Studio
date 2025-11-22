
import * as React from 'react';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent, 
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { EditorBlock } from '../../types';
import { BlockWrapper } from './BlockWrapper';
import { TipTapEditor } from './TipTapEditor';
import { Button } from '../ui/Button';
import { Plus, Image as ImageIcon, Type, LayoutTemplate, FileDown, Code, Columns2 } from 'lucide-react';
import { generateId, exportToPdf, exportToHtml } from '../../utils';

const { useState } = React;

interface EditorPaneProps {
  blocks: EditorBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<EditorBlock[]>>;
}

export const EditorPane: React.FC<EditorPaneProps> = ({ blocks, setBlocks }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Helper Functions to find blocks/containers ---

  const findContainer = (id: string, items: EditorBlock[]): string | undefined => {
    // Check root items
    if (items.find(i => i.id === id)) return 'root';
    
    // Check nested columns
    for (const item of items) {
      if (item.columns) {
        for (const col of item.columns) {
          if (col.id === id) return 'root'; // The column itself is in the item (not draggable separately in this model really, but safe guard)
          if (col.blocks.find(b => b.id === id)) return col.id;
        }
      }
    }
    return undefined;
  };

  const findBlock = (id: string, items: EditorBlock[]): EditorBlock | undefined => {
    const inRoot = items.find(i => i.id === id);
    if (inRoot) return inRoot;

    for (const item of items) {
      if (item.columns) {
        for (const col of item.columns) {
          const inCol = col.blocks.find(b => b.id === id);
          if (inCol) return inCol;
        }
      }
    }
    return undefined;
  };

  // --- Drag Handlers ---

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find which container (Root or a Column ID) the items belong to
    const activeContainer = findContainer(activeId, blocks);
    const overContainer = findContainer(overId, blocks) || 
                          // If over a column container itself (empty column case)
                          (blocks.some(b => b.columns?.some(c => c.id === overId)) ? overId : null);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    // Move Logic
    setBlocks((prev) => {
      const activeItems = activeContainer === 'root' 
        ? prev 
        : prev.flatMap(b => b.columns || []).find(c => c.id === activeContainer)?.blocks || [];
      
      const overItems = overContainer === 'root'
        ? prev
        : prev.flatMap(b => b.columns || []).find(c => c.id === overContainer)?.blocks || [];

      const activeIndex = activeItems.findIndex(i => i.id === activeId);
      const overIndex = overItems.findIndex(i => i.id === overId);

      let newIndex;
      if (overId in prev.flatMap(b => b.columns || []).map(c => c.id)) {
        // Dropping into an empty column container
        newIndex = overItems.length + 1;
      } else {
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      // Deep copy to mutate
      const nextBlocks = JSON.parse(JSON.stringify(prev));
      
      // Remove from source
      let movedItem: EditorBlock;
      if (activeContainer === 'root') {
         movedItem = nextBlocks.splice(activeIndex, 1)[0];
      } else {
         // Find the parent block of the column
         const parentBlock = nextBlocks.find((b: EditorBlock) => b.columns?.some((c: any) => c.id === activeContainer));
         const column = parentBlock.columns.find((c: any) => c.id === activeContainer);
         movedItem = column.blocks.splice(activeIndex, 1)[0];
      }

      // Add to target
      if (overContainer === 'root') {
         nextBlocks.splice(newIndex, 0, movedItem);
      } else {
         const parentBlock = nextBlocks.find((b: EditorBlock) => b.columns?.some((c: any) => c.id === overContainer));
         const column = parentBlock.columns.find((c: any) => c.id === overContainer);
         column.blocks.splice(newIndex, 0, movedItem);
      }

      return nextBlocks;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as string;
    const overId = over?.id as string;

    const activeContainer = findContainer(activeId, blocks);
    const overContainer = over ? (findContainer(overId, blocks) || (blocks.some(b => b.columns?.some(c => c.id === overId)) ? overId : null)) : null;

    if (activeContainer && overContainer && activeContainer === overContainer) {
       const activeIndex = activeContainer === 'root'
         ? blocks.findIndex(i => i.id === activeId)
         : blocks.flatMap(b => b.columns || []).find(c => c.id === activeContainer)!.blocks.findIndex(i => i.id === activeId);
         
       const overIndex = activeContainer === 'root'
         ? blocks.findIndex(i => i.id === overId)
         : blocks.flatMap(b => b.columns || []).find(c => c.id === activeContainer)!.blocks.findIndex(i => i.id === overId);

       if (activeIndex !== overIndex) {
          setBlocks((items) => {
             const next = JSON.parse(JSON.stringify(items));
             if (activeContainer === 'root') {
                return arrayMove(next, activeIndex, overIndex);
             } else {
                const parentBlock = next.find((b: EditorBlock) => b.columns?.some((c: any) => c.id === activeContainer));
                const column = parentBlock.columns.find((c: any) => c.id === activeContainer);
                column.blocks = arrayMove(column.blocks, activeIndex, overIndex);
                return next;
             }
          });
       }
    }
    setActiveId(null);
  };

  // --- Block Manipulation ---

  const updateBlockContent = (id: string, content: string) => {
    setBlocks(prev => {
       const next = JSON.parse(JSON.stringify(prev));
       const updateRecursive = (items: EditorBlock[]) => {
         for (const item of items) {
           if (item.id === id) {
             item.content = content;
             return;
           }
           if (item.columns) {
             item.columns.forEach((col: any) => updateRecursive(col.blocks));
           }
         }
       };
       updateRecursive(next);
       return next;
    });
  };

  const deleteBlock = (id: string) => {
    setBlocks(prev => {
       // If root
       if (prev.find(b => b.id === id)) return prev.filter(b => b.id !== id);

       // If nested
       const next = JSON.parse(JSON.stringify(prev));
       next.forEach((b: EditorBlock) => {
         if (b.columns) {
           b.columns.forEach((c: any) => {
             c.blocks = c.blocks.filter((child: any) => child.id !== id);
           });
         }
       });
       return next;
    });
  };

  const addBlock = (type: 'text' | 'image') => {
    const newBlock: EditorBlock = {
      id: generateId(),
      type,
      content: type === 'text' ? '<p>New text block</p>' : 'https://picsum.photos/800/400',
      styles: { padding: '1rem' }
    };
    setBlocks(prev => [...prev, newBlock]);
  };

  const addColumnsBlock = () => {
     const countStr = window.prompt("How many columns? (1-4)", "2");
     const count = parseInt(countStr || "0");
     
     if (!count || count < 1 || count > 4) return;

     const newBlock: EditorBlock = {
         id: generateId(),
         type: 'columns',
         content: '',
         styles: { padding: '1rem', margin: '0 0 1rem 0' },
         columns: Array(count).fill(null).map(() => ({
             id: generateId(),
             blocks: [] // Initialize empty columns
         }))
     };
     setBlocks(prev => [...prev, newBlock]);
  };

  // --- Render Helpers ---

  const renderBlock = (block: EditorBlock) => {
    return (
      <BlockWrapper
        key={block.id}
        id={block.id}
        onDelete={deleteBlock}
        styles={block.styles}
        isSelected={selectedId === block.id}
        onSelect={() => setSelectedId(block.id)}
      >
        {block.type === 'text' ? (
          <TipTapEditor 
            content={block.content} 
            onUpdate={(c) => updateBlockContent(block.id, c)} 
          />
        ) : block.type === 'image' ? (
          <div className="relative group">
              <img 
                  src={block.content} 
                  alt="Block content" 
                  className="w-full h-auto rounded-sm object-cover" 
              />
              <div className="absolute bottom-2 left-2 hidden group-hover:flex bg-black/70 p-2 rounded">
                   <input 
                      className="bg-transparent text-white text-xs border-b border-gray-500 focus:border-white outline-none w-64"
                      value={block.content}
                      onChange={(e) => updateBlockContent(block.id, e.target.value)}
                   />
              </div>
          </div>
        ) : block.type === 'columns' && block.columns ? (
           <div className={`grid gap-4 grid-cols-${block.columns.length} w-full`}>
              {block.columns.map((col) => (
                 <div 
                    key={col.id} 
                    className="border-2 border-dashed border-gray-200 rounded p-2 bg-gray-50/50 min-h-[100px] transition-colors hover:border-indigo-200"
                 >
                    <SortableContext items={col.blocks} strategy={verticalListSortingStrategy} id={col.id}>
                        <div className="min-h-[80px] h-full flex flex-col gap-2">
                            {col.blocks.length === 0 && (
                                <div className="text-xs text-gray-400 text-center py-4 italic">Drop blocks here</div>
                            )}
                            {col.blocks.map(renderBlock)}
                        </div>
                    </SortableContext>
                 </div>
              ))}
           </div>
        ) : (
          <div className="p-4 border-2 border-dashed border-gray-300 rounded">Container</div>
        )}
      </BlockWrapper>
    );
  };

  const activeBlock = activeId ? findBlock(activeId, blocks) : null;

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-gray-700 mr-4 flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-indigo-600" />
            <span>Studio</span>
          </div>
          <div className="h-6 w-px bg-gray-200 mx-2"></div>
          <Button variant="secondary" size="sm" onClick={() => addBlock('text')} title="Add Text">
            <Type size={16} className="mr-2" /> Text
          </Button>
          <Button variant="secondary" size="sm" onClick={() => addBlock('image')} title="Add Image">
            <ImageIcon size={16} className="mr-2" /> Image
          </Button>
          <div className="h-6 w-px bg-gray-200 mx-2"></div>
           <Button variant="secondary" size="sm" onClick={addColumnsBlock} title="Add Columns Layout">
            <Columns2 size={16} className="mr-2" /> Layout
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => exportToHtml(blocks)}>
            <Code size={16} className="mr-2" /> HTML
          </Button>
          <Button variant="primary" size="sm" onClick={() => exportToPdf('print-area')}>
            <FileDown size={16} className="mr-2" /> PDF
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto p-8 overflow-x-hidden">
        <div 
          id="print-area"
          className="max-w-4xl mx-auto bg-white min-h-[842px] shadow-lg border border-gray-200 rounded-sm p-12 transition-all"
        >
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCorners} 
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={blocks} strategy={verticalListSortingStrategy} id="root">
              {blocks.length === 0 && (
                 <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                    <p>Canvas is empty. Add blocks or ask AI to start.</p>
                 </div>
              )}
              <div className="flex flex-col gap-2 min-h-[200px]">
                  {blocks.map(renderBlock)}
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeBlock ? (
                    <div className="opacity-80 rotate-2 scale-105 cursor-grabbing pointer-events-none">
                        <div className="bg-white border border-indigo-500 shadow-2xl rounded p-4">
                             {activeBlock.type === 'text' ? 'Text Block' : activeBlock.type === 'image' ? 'Image Block' : 'Layout Block'}
                        </div>
                    </div>
                ) : null}
            </DragOverlay>

          </DndContext>
          
          <div className="mt-8 flex justify-center opacity-0 hover:opacity-100 transition-opacity">
             <Button variant="ghost" size="sm" onClick={() => addBlock('text')}>
                <Plus size={16} /> Add Block
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
