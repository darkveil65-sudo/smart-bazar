import { FC, ReactNode } from 'react';

interface CardProps {
  className?: string;
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
}

const Card: FC<CardProps> = ({
  className = '',
  children,
  header,
  footer,
}) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {header && <div className="pb-4 pt-5 px-6 sm:px-7">{header}</div>}
      <div className="px-5 pt-6 pb-4 sm:px-7">{children}</div>
      {footer && <div className="px-5 pt-4 sm:px-7">{footer}</div>}
    </div>
  );
};

export default Card;