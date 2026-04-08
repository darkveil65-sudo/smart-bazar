import { FC } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  animation?: 'pulse' | 'wave';
}

const Skeleton: FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  animation = 'pulse',
}) => {
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-[wave_2s_ease-in-out_infinite]',
  };
  
  return (
    <div
      className={`bg-gray-200 rounded ${animationClasses[animation]} ${className}`}
      style={{ width, height }}
    ></div>
  );
};

export default Skeleton;