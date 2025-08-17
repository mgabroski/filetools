import React from 'react';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ children, className = '', ...props }: DivProps) {
  return (
    <div
      {...props}
      className={`rounded-2xl shadow-sm border border-zinc-200 bg-white ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }: DivProps) {
  return (
    <div {...props} className={`p-4 sm:p-5 border-b border-zinc-100 ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '', ...props }: DivProps) {
  return (
    <div {...props} className={`p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}
