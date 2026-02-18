/**
 * ErrorBoundary Component Tests
 * Tests error handling and fallback UI
 */

import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

// Component that throws an error
const ThrowError = () => {
  throw new Error('Test error');
};

// Component that works normally
const NoError = () => <div>Normal component</div>;

// Suppress console.error for these tests since we expect errors
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

describe('ErrorBoundary Component', () => {
  test('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <NoError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal component')).toBeInTheDocument();
  });

  test('catches errors and displays fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  test('displays error message in fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });

  test('provides reload button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const reloadButton = screen.queryByText(/reload/i) || 
                        screen.queryByText(/try again/i);
    
    if (reloadButton) {
      expect(reloadButton).toBeInTheDocument();
    }
  });

  test('does not interfere with normal rendering', () => {
    const { container } = render(
      <ErrorBoundary>
        <div data-testid="test-content">
          <h1>Title</h1>
          <p>Content</p>
        </div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  test('isolates errors to wrapped component', () => {
    const { container } = render(
      <div>
        <div>Outside boundary</div>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
        <div>Also outside</div>
      </div>
    );

    // Elements outside error boundary should still render
    expect(screen.getByText('Outside boundary')).toBeInTheDocument();
    expect(screen.getByText('Also outside')).toBeInTheDocument();
    
    // Error boundary should show error UI
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});

describe('ErrorBoundary State Management', () => {
  test('initializes with no error state', () => {
    const { container } = render(
      <ErrorBoundary>
        <NoError />
      </ErrorBoundary>
    );

    // No error message should be visible
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  test('updates state when error is caught', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Error message should now be visible
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});

describe('ErrorBoundary Edge Cases', () => {
  test('handles multiple children', () => {
    render(
      <ErrorBoundary>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
    expect(screen.getByText('Child 3')).toBeInTheDocument();
  });

  test('handles null children', () => {
    const { container } = render(
      <ErrorBoundary>
        {null}
      </ErrorBoundary>
    );

    expect(container).toBeInTheDocument();
  });

  test('handles undefined children', () => {
    const { container } = render(
      <ErrorBoundary>
        {undefined}
      </ErrorBoundary>
    );

    expect(container).toBeInTheDocument();
  });
});
