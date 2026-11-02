import '@testing-library/jest-dom';
import React from 'react';

// Pastikan React tersedia di scope global untuk menghindari "React is not defined" pada JSX test suites
(globalThis as unknown as { React: typeof React }).React = React;

// Mock IntersectionObserver untuk komponen yang menggunakan Framer Motion whileInView / IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  disconnect = () => {};
  observe = () => {};
  takeRecords = () => [];
  unobserve = () => {};
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
}
Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

