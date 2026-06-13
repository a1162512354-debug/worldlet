import { useState } from 'react';

export function OptionList(props: {
  options: string[];
  disabled: boolean;
  onPick: (text: string) => void;
  showCustomInput?: boolean;
}) {
  const [custom, setCustom] = useState('');
  const showCustomInput = props.showCustomInput ?? true;
  const filteredOptions = props.options.filter(opt => opt.trim().length > 0);
  return (
    <div className="st-options">
      {filteredOptions.map((opt, i) => (
        <button key={i} disabled={props.disabled} onClick={() => props.onPick(opt)}>
          <span>[{i + 1}]</span> {opt}
        </button>
      ))}
      {showCustomInput && (
        <div className="st-custom-input-row">
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="自由输入…"
            disabled={props.disabled}
            onKeyDown={e => {
              if (e.key === 'Enter' && custom.trim()) {
                props.onPick(custom.trim());
                setCustom('');
              }
            }}
          />
          <button disabled={props.disabled || !custom.trim()} onClick={() => { props.onPick(custom.trim()); setCustom(''); }}>发送</button>
        </div>
      )}
    </div>
  );
}
