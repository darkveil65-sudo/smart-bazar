import { FC } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

const Skeleton: FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
}) => {
  return (
    <div
      className={`animate-shimmer rounded-lg ${className}`}
      style={{ width, height }}
    />
  );
};

export default Skeleton;