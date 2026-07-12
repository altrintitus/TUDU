import { useLayoutEffect, useRef } from 'react';

// contenteditable text field. Unlike <input>/<textarea> it is NOT a form
// control, so iOS shows no keyboard form-assistant bar (∧ ∨ Done). Value is
// mirrored to React state via onInput; placeholder via the `is-empty` class.
export function EditableText({ value, onChange, placeholder, ariaLabel, className, multiline, autoFocus, onEnter }: {
  value: string;
  onChange(v: string): void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  onEnter?(): void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  // sync DOM text when value changes externally (guarded so typing doesn't
  // reset the caret — during typing el.innerText already equals value).
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.innerText !== value) el.innerText = value;
  }, [value]);

  const onInput = () => onChange(ref.current?.innerText ?? '');
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!multiline && e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onEnter?.();
    }
  };

  return (
    <div
      ref={ref}
      className={`${className ?? ''}${value ? '' : ' is-empty'}`}
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline={multiline ? true : undefined}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      autoCorrect="off"
      spellCheck={false}
      onInput={onInput}
      onKeyDown={onKeyDown}
    />
  );
}
