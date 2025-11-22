
import { EditorBlock } from './types';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const exportToPdf = (elementId: string, filename: string = 'document.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // @ts-ignore - html2pdf is loaded via CDN
  const opt = {
    margin: [10, 10],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // @ts-ignore
  if (window.html2pdf) {
    // @ts-ignore
    window.html2pdf().set(opt).from(element).save();
  } else {
    alert("PDF export library not loaded yet.");
  }
};

const renderBlockHtml = (block: EditorBlock): string => {
  let styleString = '';
  if (block.styles) {
    styleString = Object.entries(block.styles)
      .map(([k, v]) => `${k.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}:${v}`)
      .join(';');
  }
  
  const wrapperStyle = `style="${styleString}"`;

  if (block.type === 'image') {
    return `<div ${wrapperStyle}><img src="${block.content}" style="max-width:100%;" /></div>`;
  } else if (block.type === 'columns' && block.columns) {
    const columnsHtml = block.columns.map(col => {
      const innerHtml = col.blocks.map(b => renderBlockHtml(b)).join('');
      return `<div style="flex: 1; min-width: 0; padding: 10px;">${innerHtml}</div>`;
    }).join('');
    return `<div ${wrapperStyle} style="display: flex; gap: 20px;">${columnsHtml}</div>`;
  }
  
  return `<div ${wrapperStyle}>${block.content}</div>`;
};

export const exportToHtml = (blocks: EditorBlock[]) => {
  const htmlContent = blocks.map(renderBlockHtml).join('\n');

  const blob = new Blob([`
    <!DOCTYPE html>
    <html>
    <head><style>body{font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;}</style></head>
    <body>${htmlContent}</body>
    </html>
  `], { type: 'text/html' });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'document.html';
  a.click();
  URL.revokeObjectURL(url);
};
