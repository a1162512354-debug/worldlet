import { useState } from 'react';

export function ThinkingFold({ text, mode }: { text: string; mode: 'fold' | 'hide' | 'inline' }) {
  const [open, setOpen] = useState(false);
  if (!text || mode === 'hide') return null;
  if (mode === 'inline') return <div className="st-thinking-pane st-thinking-pane-inline">{text}</div>;
  return (
    <div className="st-thinking-pane">
      <button className="st-thinking-pane-toggle" onClick={() => setOpen(o => !o)}>{open ? '▾' : '▸'} 思考过程</button>
      {open && <pre className="st-thinking-pane-content">{text}</pre>}
    </div>
  );
}
