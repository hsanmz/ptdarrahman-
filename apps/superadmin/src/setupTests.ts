import '@testing-library/jest-dom';
import React from 'react';

// Pastikan React tersedia di scope global untuk menghindari "React is not defined" pada JSX test suites
(globalThis as unknown as { React: typeof React }).React = React;

