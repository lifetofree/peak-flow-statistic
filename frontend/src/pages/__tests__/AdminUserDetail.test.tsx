import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminUserDetail from '../AdminUserDetail';
import * as adminApi from '../../api/admin';

// Mock the admin API module
vi.mock('../../api/admin', () => ({
  fetchUser: vi.fn(),
  fetchAdminEntries: vi.fn(),
  deleteUser: vi.fn(),
  updateUserNote: vi.fn(),
  getAdminExportUrl: vi.fn((id: string) => `/api/admin/users/${id}/export`),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: (val: string) => val,
  },
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'test-user-id' }),
  };
});

describe('AdminUserDetail', () => {
  let queryClient: QueryClient;
  const mockUserId = 'test-user-id';

  const mockUser = {
    _id: mockUserId,
    firstName: 'John',
    lastName: 'Doe',
    nickname: 'JD',
    shortCode: 'abc12345',
    shortToken: 'token123',
    personalBest: 450,
    adminNote: '<p>Test admin note</p>',
    instructionBox: '<p>Test instruction</p>',
    userNote: '<p>Test patient note</p>',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockEntries = {
    entries: [
      {
        _id: 'entry1',
        userId: mockUserId,
        date: '2024-01-15',
        period: 'morning',
        medicationTiming: 'before',
        peakFlowReadings: [400, 410, 405],
        spO2: 98,
        note: 'Feeling good',
        createdAt: '2024-01-15T08:00:00Z',
        updatedAt: '2024-01-15T08:00:00Z',
        zone: { zone: 'green', percentage: 89 },
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn((key: string) => {
        if (key === 'adminToken') return 'mock-token';
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };

    // Mock fetch for export
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['mock,csv,data']),
    } as Response);
    
    // Default mocks to prevent "Query data cannot be undefined"
    vi.mocked(adminApi.fetchUser).mockResolvedValue(mockUser);
    vi.mocked(adminApi.fetchAdminEntries).mockResolvedValue(mockEntries);
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/admin/users/${mockUserId}`]}>
          <Routes>
            <Route path="/admin/users/:id" element={component} />
            <Route path="/admin" element={<div>Admin Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('Component Rendering', () => {
    it('should show loading state while fetching user data', async () => {
      vi.mocked(adminApi.fetchUser).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockUser), 100))
      );

      renderWithProviders(<AdminUserDetail />);

      const spinners = document.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);
    });

    it('should display user data after successful fetch', async () => {
      renderWithProviders(<AdminUserDetail />);

      await waitFor(() => {
        expect(screen.getByText(/John/)).toBeInTheDocument();
      });
    });

    it('should display error state when user fetch fails', async () => {
      vi.mocked(adminApi.fetchUser).mockRejectedValue(new Error('User not found'));

      renderWithProviders(<AdminUserDetail />);

      await waitFor(() => {
        expect(screen.getByText(/common.error/)).toBeInTheDocument();
      });
    });

    it('should render UserProfile component with user data', async () => {
      renderWithProviders(<AdminUserDetail />);

      await waitFor(() => {
        expect(screen.getByText(/John/)).toBeInTheDocument();
        expect(screen.getByText(/Doe/)).toBeInTheDocument();
      });
    });

    it('should render UserShareLink component with short code', async () => {
      renderWithProviders(<AdminUserDetail />);

      await waitFor(() => {
        expect(screen.getAllByText(new RegExp(mockUser.shortCode)).length).toBeGreaterThan(0);
      });
    });
  });

  describe('User Actions', () => {
    it('should navigate back to admin dashboard when back button is clicked', async () => {
      renderWithProviders(<AdminUserDetail />);

      await waitFor(() => {
        expect(screen.getByText(/common.back/)).toBeInTheDocument();
      });

      const backButton = screen.getByText(/common.back/);
      // Check if navigation occurred (link has href attribute)
      expect(backButton.closest('a')).toHaveAttribute('href', '/admin');
    });

    it('should confirm and delete user when delete button is clicked and confirmed', async () => {
      global.confirm = vi.fn(() => true);
      vi.mocked(adminApi.deleteUser).mockResolvedValue(undefined);

      renderWithProviders(<AdminUserDetail />);

      await waitFor(() => {
        expect(screen.getByText(/admin.deleteUser/)).toBeInTheDocument();
      });

      const deleteButton = screen.getByText(/admin.deleteUser/);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalled();
        expect(adminApi.deleteUser).toHaveBeenCalledWith(mockUserId);
      });
    });

    it('should not delete user when delete button is clicked but cancelled', async () => {
      global.confirm = vi.fn(() => false);

      renderWithProviders(<AdminUserDetail />);

      await waitFor(() => {
        expect(screen.getByText(/admin.deleteUser/)).toBeInTheDocument();
      });

      const deleteButton = screen.getByText(/admin.deleteUser/);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalled();
        expect(adminApi.deleteUser).not.toHaveBeenCalled();
      });
    });

    it('should handle export functionality', async () => {
      renderWithProviders(<AdminUserDetail />);

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /admin.export/i });
        expect(exportButton).toBeInTheDocument();
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Entry Management', () => {
    it('should display entries in the table', async () => {
      renderWithProviders(<AdminUserDetail />);

      await waitFor(() => {
        expect(screen.getByText(/2024/)).toBeInTheDocument();
      });
    });

    it('should show loading state for entries', async () => {
      vi.mocked(adminApi.fetchAdminEntries).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockEntries), 100))
      );

      renderWithProviders(<AdminUserDetail />);

      await waitFor(() => {
        expect(screen.getByText(/John/)).toBeInTheDocument();
      });

      // Check for loading spinner in entries section
      const spinners = document.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);
    });

    it('should display note modal when note icon is clicked', async () => {
      renderWithProviders(<AdminUserDetail />);

      await waitFor(() => {
        expect(screen.getByText(/John/)).toBeInTheDocument();
      });

      // Find all buttons, click the one in the table cell for notes
      const table = screen.getByRole('table');
      const noteButton = table.querySelector('button'); // First button in table is likely the note icon
      if (noteButton) {
        fireEvent.click(noteButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/Feeling good/)).toBeInTheDocument();
      });
    });
  });

  describe('Patient Note Management', () => {
    it('should render UserPatientNote component with patient note', async () => {
      renderWithProviders(<AdminUserDetail />);

      await waitFor(() => {
        expect(screen.getByText(/entry.noteFromPatient/)).toBeInTheDocument();
        expect(screen.getByText(/Test patient note/)).toBeInTheDocument();
      });
    });
  });

  describe('Instruction Box', () => {
    it('should render UserInstructionBox component', async () => {
      renderWithProviders(<AdminUserDetail />);

      await waitFor(() => {
        expect(screen.getByText(/admin.instructionBox/)).toBeInTheDocument();
        expect(screen.getByText(/Test instruction/)).toBeInTheDocument();
      });
    });
  });
});
