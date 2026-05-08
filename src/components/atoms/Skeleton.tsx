/**
 * @file Skeleton.tsx
 * @description Atom Skeleton — placeholder animado pra estados de loading.
 *              4 variantes: text | circle | rect | row (linha de tabela).
 *              Respeita prefers-reduced-motion.
 * @story Sprint 1 / S1-02
 * @agent @dev
 * @created 2026-05-08
 */
import type { FC, HTMLAttributes } from 'react';

type Variant = 'text' | 'circle' | 'rect' | 'row';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  width?: string | number;
  height?: string | number;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  text: 'h-3 rounded-md',
  circle: 'rounded-full aspect-square',
  rect: 'rounded-lg',
  row: 'h-12 rounded-md',
};

export const Skeleton: FC<SkeletonProps> = ({
  variant = 'rect',
  width,
  height,
  className = '',
  style,
  ...rest
}) => {
  return (
    <div
      aria-hidden
      className={[
        'animate-pulse bg-slate-200/70 dark:bg-slate-700/40 motion-reduce:animate-none',
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
      style={{ width, height, ...style }}
      {...rest}
    />
  );
};

/**
 * SkeletonRows — render N linhas de skeleton em sequência (uso comum em tabelas).
 */
interface SkeletonRowsProps {
  count?: number;
  className?: string;
}

export const SkeletonRows: FC<SkeletonRowsProps> = ({ count = 5, className = '' }) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="row" />
      ))}
    </div>
  );
};
