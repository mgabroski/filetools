import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl shadow-sm border border-zinc-200 bg-white ${className}`}>
      {children}
    </div>
  );
}
export function CardHeader({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-4 sm:p-5 border-b border-zinc-100 ${className}`}>{children}</div>;
}
export function CardContent({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-4 sm:p-5 ${className}`}>{children}</div>;
}
