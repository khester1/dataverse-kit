import React from 'react';
import { FluentProvider } from '@fluentui/react-components';
import { dynamicsV9Theme } from '../theme';

// jsdom lacks ResizeObserver + matchMedia, which FluentProvider / v9 components can
// touch. Polyfill them once at import time (before any render).
if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}
if (typeof window !== 'undefined' && !window.matchMedia) {
  (window as unknown as { matchMedia: (q: string) => unknown }).matchMedia = (q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

/** Every v9 grid surface renders inside a FluentProvider (v9's theme/renderer context). */
export const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => (
  <FluentProvider theme={dynamicsV9Theme}>{children}</FluentProvider>
);
