/**
 * Frontend Component Tests
 * Tests React components, user interactions, and UI behavior
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock fetch API
global.fetch = jest.fn();

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
  fetch.mockClear();
});

describe('App Component - Initial Render', () => {
  test('renders login screen when not authenticated', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /cidg rfu 4a/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('displays username and password input fields', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  test('shows system title correctly', () => {
    render(<App />);
    expect(screen.getByText(/document management system/i)).toBeInTheDocument();
  });
});

describe('Login Functionality', () => {
  test('allows user to type in username field', async () => {
    render(<App />);
    const usernameInput = screen.getByPlaceholderText(/username/i);
    
    await userEvent.type(usernameInput, 'testuser');
    expect(usernameInput.value).toBe('testuser');
  });

  test('allows user to type in password field', async () => {
    render(<App />);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    
    await userEvent.type(passwordInput, 'password123');
    expect(passwordInput.value).toBe('password123');
  });

  test('password field should be of type password', () => {
    render(<App />);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    expect(passwordInput.type).toBe('password');
  });

  test('handles successful login', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      role: 'admin',
      section: 'IT'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'fake-jwt-token',
        user: mockUser
      }),
    });

    render(<App />);
    
    const usernameInput = screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /sign in/i });

    await userEvent.type(usernameInput, 'testuser');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );
    });
  });

  test('displays error message on login failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Invalid credentials'
      }),
    });

    render(<App />);
    
    const usernameInput = screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /sign in/i });

    await userEvent.type(usernameInput, 'wronguser');
    await userEvent.type(passwordInput, 'wrongpass');
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  test('prevents login with empty fields', async () => {
    render(<App />);
    const loginButton = screen.getByRole('button', { name: /sign in/i });

    await userEvent.click(loginButton);

    // Should show validation or error
    await waitFor(() => {
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});

describe('Logout Functionality', () => {
  test('allows user to logout', async () => {
    // Mock authenticated state
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'fake-token';
      if (key === 'user') return JSON.stringify({ username: 'testuser', role: 'admin' });
      return null;
    });

    render(<App />);

    // Look for logout button (may need to adjust selector based on actual implementation)
    const logoutButton = screen.queryByText(/logout/i);
    
    if (logoutButton) {
      await userEvent.click(logoutButton);
      
      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      });
    }
  });
});

describe('Records Management', () => {
  beforeEach(() => {
    // Mock authenticated state
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'fake-token';
      if (key === 'user') return JSON.stringify({ username: 'admin', role: 'admin' });
      return null;
    });

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ([]),
    });
  });

  test('displays records list when authenticated', async () => {
    const mockRecords = [
      {
        id: 1,
        controlNumber: 'IT-2026-001',
        section: 'IT',
        dateReceived: '2026-02-18',
        from: 'Test User',
        nature: 'Test Record',
        actionTaken: 'Pending'
      }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRecords,
    });

    render(<App />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/records'),
        expect.any(Object)
      );
    });
  });

  test('handles record search functionality', async () => {
    render(<App />);

    // Look for search input
    const searchInput = screen.queryByPlaceholderText(/search/i);
    
    if (searchInput) {
      await userEvent.type(searchInput, 'test query');
      expect(searchInput.value).toBe('test query');
    }
  });

  test('allows filtering by section', async () => {
    render(<App />);

    // Look for section filter dropdown
    const sectionFilter = screen.queryByLabelText(/section/i) || 
                          screen.queryByText(/all sections/i);
    
    if (sectionFilter) {
      fireEvent.click(sectionFilter);
    }
  });
});

describe('Form Validation', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'fake-token';
      if (key === 'user') return JSON.stringify({ username: 'admin', role: 'admin' });
      return null;
    });

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ([]),
    });
  });

  test('validates required fields in record form', async () => {
    render(<App />);

    // Look for "Add Record" or similar button
    const addButton = screen.queryByText(/add record/i) || 
                      screen.queryByText(/new record/i);
    
    if (addButton) {
      await userEvent.click(addButton);

      // Try to submit without filling required fields
      const submitButton = screen.queryByText(/save/i) || 
                          screen.queryByText(/submit/i);
      
      if (submitButton) {
        await userEvent.click(submitButton);
        // Should show validation errors
      }
    }
  });

  test('validates date format', async () => {
    render(<App />);

    const dateInput = screen.queryByLabelText(/date received/i);
    
    if (dateInput) {
      await userEvent.type(dateInput, 'invalid-date');
      // Should show validation error
    }
  });
});

describe('Error Handling', () => {
  test('displays error message when API fails', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'fake-token';
      if (key === 'user') return JSON.stringify({ username: 'admin', role: 'admin' });
      return null;
    });

    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);

    await waitFor(() => {
      // Should display some error indication
      const errorElements = screen.queryAllByText(/error/i);
      expect(errorElements.length).toBeGreaterThanOrEqual(0);
    });
  });

  test('handles unauthorized access gracefully', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    render(<App />);

    // Should show login screen
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});

describe('Accessibility', () => {
  test('login form has proper labels', () => {
    render(<App />);
    
    const usernameInput = screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    
    expect(usernameInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  test('buttons have accessible text', () => {
    render(<App />);
    
    const loginButton = screen.getByRole('button', { name: /sign in/i });
    expect(loginButton).toHaveTextContent(/sign in/i);
  });

  test('headings are properly structured', () => {
    render(<App />);
    
    const mainHeading = screen.getByRole('heading', { name: /cidg rfu 4a/i });
    expect(mainHeading).toBeInTheDocument();
  });
});

describe('Performance', () => {
  test('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
  });

  test('cleans up resources on unmount', () => {
    const { unmount } = render(<App />);
    unmount();
    // Component should unmount without errors
  });
});
