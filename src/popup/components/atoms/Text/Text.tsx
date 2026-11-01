import type { ReactNode } from 'react';
import styles from './Text.module.scss';

interface TextProps {
  children: ReactNode;
  variant?: 'body' | 'muted' | 'strong';
  as?: 'span' | 'p' | 'strong';
}

export function Text({ children, variant = 'body', as: Element = 'span' }: TextProps) {
  return <Element className={styles[variant]}>{children}</Element>;
}
