const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const Spinner = ({ size = 'md', className = '' }) => {
  return (
    <div
      className={`
        ${sizes[size]}
        border-2 border-rose-light border-t-deep
        rounded-full animate-spin
        ${className}
      `}
      role="status"
      aria-label="Loading"
    />
  );
};

// Full page loading overlay
Spinner.Overlay = ({ message = 'Loading...' }) => (
  <div className="fixed inset-0 bg-cream/80 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="text-center">
      <Spinner size="xl" className="mx-auto mb-4" />
      <p className="text-text-light font-medium">{message}</p>
    </div>
  </div>
);

// Inline loading indicator
Spinner.Inline = ({ size = 'sm', className = '' }) => (
  <span className={`inline-flex items-center gap-2 ${className}`}>
    <Spinner size={size} />
  </span>
);

export default Spinner;
