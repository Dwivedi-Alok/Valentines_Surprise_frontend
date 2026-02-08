import { forwardRef, useState } from 'react';

const Input = forwardRef(({
  label,
  type = 'text',
  error,
  helperText,
  icon,
  className = '',
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className={`${className}`}>
      {/* Label - always above the input */}
      {label && (
        <label className="block text-sm font-medium text-text-light mb-1.5">
          {label}
        </label>
      )}

      {/* Input container */}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          className={`
            w-full px-4 py-3 
            ${icon ? 'pl-10' : ''}
            bg-white border rounded-xl
            text-text placeholder:text-text-muted
            transition-all duration-200 ease-out
            focus:outline-none
            ${error 
              ? 'border-error focus:border-error' 
              : 'border-rose-light focus:border-deep focus:ring-valentine'
            }
            ${focused ? 'shadow-soft' : 'shadow-subtle'}
          `}
          {...props}
        />
      </div>

      {/* Helper/Error text */}
      {(error || helperText) && (
        <p className={`mt-1.5 text-sm ${error ? 'text-error' : 'text-text-muted'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
