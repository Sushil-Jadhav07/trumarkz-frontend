import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { addEmails, isEmailLike } from '@/utils/sdcEmailShare';

// Several email addresses as chips. Paste or type addresses separated by commas, semicolons, spaces or new lines; Enter,
// comma, space and leaving the field add what was typed. An invalid address stays as a red chip so it can be fixed.
export const EmailChipsInput = ({ value, onChange, disabled = false, placeholder = 'name@company.com, another@company.com', ariaLabel = 'Email addresses', onDuplicate }) => {
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const commit = (text) => {
    if (!String(text || '').trim()) return;
    const { list, duplicates } = addEmails(value, text);
    if (list.length !== value.length) onChange(list);
    if (duplicates > 0) onDuplicate?.(duplicates);
    setDraft('');
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={`flex min-h-[42px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-xl border bg-white px-2 py-1.5 transition-colors focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/15 ${disabled ? 'cursor-not-allowed border-gray-100 bg-gray-50' : 'border-gray-200'}`}
    >
      {value.map((email) => {
        const ok = isEmailLike(email);
        return (
          <span
            key={email}
            title={ok ? undefined : 'Not a valid email address'}
            className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium font-inter ${ok ? 'bg-blue-50 text-brand-blue' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}
          >
            <span className="truncate">{email}</span>
            {!disabled && (
              <button type="button" aria-label={`Remove ${email}`} onClick={(e) => { e.stopPropagation(); onChange(value.filter((v) => v !== email)); }} className="shrink-0 opacity-70 hover:opacity-100">
                <X size={12} />
              </button>
            )}
          </span>
        );
      })}
      <input
        ref={inputRef}
        value={draft}
        disabled={disabled}
        aria-label={ariaLabel}
        placeholder={value.length === 0 ? placeholder : ''}
        onChange={(e) => {
          const text = e.target.value;
          // a separator typed or pasted adds what came before it
          if (/[\s,;]$/.test(text) && text.trim()) commit(text); else setDraft(text);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(draft); }
          else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          // several addresses, or one complete address: becomes chips right away
          if (/[\s,;]/.test(text.trim()) || isEmailLike(text.trim())) { e.preventDefault(); commit(`${draft} ${text}`); }
        }}
        onBlur={() => commit(draft)}
        className="min-w-[160px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-brand-dark outline-none placeholder:text-gray-400 font-inter disabled:cursor-not-allowed"
      />
    </div>
  );
};

export default EmailChipsInput;
