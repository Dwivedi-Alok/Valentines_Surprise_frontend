const variants = {
  default: 'bg-white border border-rose-light',
  elevated: 'bg-white shadow-soft',
  gradient: 'gradient-card border border-rose-light/50',
  blush: 'bg-blush border border-rose-light',
};

const Card = ({
  children,
  variant = 'elevated',
  padding = 'md',
  hover = false,
  className = '',
  ...props
}) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`
        rounded-2xl
        transition-all duration-200 ease-out
        ${variants[variant]}
        ${paddings[padding]}
        ${hover ? 'hover:shadow-medium hover:-translate-y-0.5 cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

// Card Header for organized layouts
Card.Header = ({ children, className = '' }) => (
  <div className={`mb-4 pb-4 border-b border-rose-light/50 ${className}`}>
    {children}
  </div>
);

// Card Title
Card.Title = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-dark ${className}`}>
    {children}
  </h3>
);

// Card Description
Card.Description = ({ children, className = '' }) => (
  <p className={`text-sm text-text-light mt-1 ${className}`}>
    {children}
  </p>
);

// Card Body
Card.Body = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);

// Card Footer
Card.Footer = ({ children, className = '' }) => (
  <div className={`mt-4 pt-4 border-t border-rose-light/50 ${className}`}>
    {children}
  </div>
);

export default Card;
