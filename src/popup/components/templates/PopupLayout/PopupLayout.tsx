import type { ReactNode } from 'react';
import styles from './PopupLayout.module.scss';

interface PopupLayoutProps {
  header: ReactNode;
  status: ReactNode;
  settings: ReactNode;
}

export function PopupLayout({ header, status, settings }: PopupLayoutProps) {
  return (
    <div className={styles.layout}>
      <header>
        <h1 className={styles.title}>{header}</h1>
      </header>
      <main className={styles.main}>
        {status}
        {settings}
      </main>
    </div>
  );
}
