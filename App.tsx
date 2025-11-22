
import * as React from 'react';
import { EditorPane } from './components/editor/EditorPane';
import { AssistantPane } from './components/ai/AssistantPane';
import { EditorBlock } from './types';
import { generateId } from './utils';

const { useState } = React;

export const App: React.FC = () => {
  const [blocks, setBlocks] = useState<EditorBlock[]>([
    {
      id: generateId(),
      type: 'text',
      content: '<h1>Welcome to Smart Template Studio</h1><p>Drag blocks to reorder, or use the AI on the right to generate content.</p>',
      styles: { padding: '1.5rem', textAlign: 'center' }
    },
    {
      id: generateId(),
      type: 'image',
      content: 'https://picsum.photos/800/300',
      styles: { margin: '0' }
    }
  ]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      {/* Left: Editor Canvas */}
      <main className="flex-1 h-full relative">
        <EditorPane blocks={blocks} setBlocks={setBlocks} />
      </main>

      {/* Right: AI Assistant */}
      <aside className="w-[400px] h-full flex-shrink-0">
        <AssistantPane blocks={blocks} setBlocks={setBlocks} />
      </aside>
    </div>
  );
};
