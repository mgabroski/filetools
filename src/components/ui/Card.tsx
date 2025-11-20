import React from 'react';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ children, className = '', ...props }: DivProps) {
  return (
    <div
      {...props}
      className={`rounded-2xl border border-zinc-200 bg-white/80 backdrop-blur-sm 
hover:border-blue-500 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]
transition-all duration-300 ${className}`}
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