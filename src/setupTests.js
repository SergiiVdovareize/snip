import '@testing-library/jest-dom';

// Mock Sentry globally to prevent tracking during tests
jest.mock('@sentry/react', () => ({
    init: jest.fn(),
    captureMessage: jest.fn(),
    captureException: jest.fn(),
    browserTracingIntegration: jest.fn(),
    replayIntegration: jest.fn(),
}));

// Mock PostHog globally (using virtual: true in case it gets added later)
jest.mock(
    'posthog-js',
    () => ({
        init: jest.fn(),
        capture: jest.fn(),
        identify: jest.fn(),
    }),
    { virtual: true },
);
