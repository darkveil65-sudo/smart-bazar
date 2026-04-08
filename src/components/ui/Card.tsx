import { FC, ReactNode } from 'react';

interface CardProps {
  className?: string;
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  hover?: boolean;
  onClick?: () => void;
}

const Card: FC<CardProps> = ({
  className = '',
  children,
  header,
  footer,
  hover = false,
  onClick,
}) => {
  return (
    <div
      className={`bg-card border border-border rounded-2xl shadow-sm
        ${hover ? 'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}`}
      onClick={onClick}
    >
      {header && <div className="px-6 pt-5 pb-3">{header}</div>}
      <div className="px-6 py-4">{children}</div>
      {footer && <div className="px-6 pt-2 pb-4 border-t border-border">{footer}</div>}
    </div>
  );
};

export default Card;