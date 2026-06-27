import React, { useId, useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

// Custom-rendered listbox (not a native <select>). The kiosk shell scales
// its whole page via CSS transform (see useKioskScale) — a native <select>
// dropdown is an OS overlay that ignores that transform, so it always pops
// up full-size with default browser styling, clashing with the scaled-down
// themed page underneath. Rendering the option list ourselves keeps it
// inside the transformed DOM tree so it scales and themes correctly.
const Select = ({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  error,
  disabled = false,
  required = false,
  className = '',
  voiceField,
  id,
  ...props
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const errorId = error ? `${selectId}-error` : undefined;
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selected = options.find((o) => (o.value ?? o.id) === value);

  const selectOption = (optionValue) => {
    setOpen(false);
    onChange?.({ target: { value: optionValue } });
  };

  return (
    <div className={`w-full ${className}`} ref={rootRef}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-kiosk-base font-semibold text-gray-700 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={selectId}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          data-voice-field={voiceField || undefined}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={`
            w-full px-[calc(28px*var(--ui-scale))] py-[calc(22px*var(--ui-scale))] text-kiosk-lg rounded-[calc(20px*var(--ui-scale))] border-2 text-left min-h-[calc(88px*var(--ui-scale))]
            transition-all duration-200 touch-manipulation truncate
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-government-blue focus:ring-blue-200'}
            ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-white'}
            focus:outline-none focus:ring-4
            pr-[calc(48px*var(--ui-scale))]
          `}
          {...props}
        >
          {selected ? (selected.label || selected.name) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </button>
        <div className="absolute right-[calc(20px*var(--ui-scale))] top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500" aria-hidden="true">
          <ChevronDown className={`w-[calc(22px*var(--ui-scale))] h-[calc(22px*var(--ui-scale))] transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>

        {open && (
          <ul
            role="listbox"
            tabIndex={-1}
            aria-labelledby={selectId}
            className="absolute z-20 mt-2 w-full max-h-[60vh] overflow-y-auto bg-white border-2 border-gray-300 rounded-[calc(20px*var(--ui-scale))] shadow-kiosk-hover"
          >
            {options.map((option) => {
              const optionValue = option.value ?? option.id;
              const isSelected = optionValue === value;
              return (
                <li
                  key={optionValue}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectOption(optionValue)}
                  className={`
                    px-[calc(28px*var(--ui-scale))] py-[calc(16px*var(--ui-scale))] text-kiosk-base leading-snug break-words cursor-pointer touch-manipulation
                    ${isSelected ? 'bg-blue-50 text-government-blue font-semibold' : 'text-gray-800 hover:bg-gray-50'}
                  `}
                >
                  {option.label || option.name}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-kiosk-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
};

export default Select;
