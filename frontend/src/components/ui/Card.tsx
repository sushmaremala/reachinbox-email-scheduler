import React, { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-sm transition-all duration-200',
        onClick && 'cursor-pointer hover:border-slate-700 hover:bg-slate-800/40',
        className
      )}
    >
      {children}
    </div>
  );
};
