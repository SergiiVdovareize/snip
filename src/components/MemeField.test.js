import { fireEvent, render, screen } from '@testing-library/react';
import useMemeStealer from '../hooks/useMemeStealer';
import MemeField from './MemeField';

jest.mock('../hooks/useMemeStealer');

describe('MemeField Component', () => {
    let mockStealMeme;
    let mockResetErrors;

    beforeEach(() => {
        mockStealMeme = jest.fn();
        mockResetErrors = jest.fn();
        useMemeStealer.mockReturnValue({
            stealMeme: mockStealMeme,
            isStealing: false,
            isDownloading: false,
            downloadProgress: 0,
            isIndeterminate: false,
            isError: false,
            errorMessage: null,
            resetErrors: mockResetErrors,
        });
    });

    test('renders form elements', () => {
        render(<MemeField />);
        expect(
            screen.getByPlaceholderText(/paste url here/i),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /reset/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /paste/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /steal me/i }),
        ).toBeInTheDocument();
    });

    test('disables form fields and updates button label during stealing', () => {
        useMemeStealer.mockReturnValue({
            stealMeme: mockStealMeme,
            isStealing: true,
            isDownloading: false,
            downloadProgress: 0,
            isIndeterminate: true,
            isError: false,
            errorMessage: null,
            resetErrors: mockResetErrors,
        });

        render(<MemeField />);
        expect(screen.getByPlaceholderText(/paste url here/i)).toBeDisabled();
        expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /paste/i })).toBeDisabled();
        expect(
            screen.getByRole('button', { name: /stealing\.\.\.\.\./i }),
        ).toBeDisabled();
    });

    test('disables form fields and updates button label during downloading', () => {
        useMemeStealer.mockReturnValue({
            stealMeme: mockStealMeme,
            isStealing: false,
            isDownloading: true,
            downloadProgress: 50,
            isIndeterminate: false,
            isError: false,
            errorMessage: null,
            resetErrors: mockResetErrors,
        });

        render(<MemeField />);
        expect(screen.getByPlaceholderText(/paste url here/i)).toBeDisabled();
        expect(
            screen.getByRole('button', { name: /downloading\.\.\./i }),
        ).toBeDisabled();
    });

    test('renders error message when present', () => {
        useMemeStealer.mockReturnValue({
            stealMeme: mockStealMeme,
            isStealing: false,
            isDownloading: false,
            downloadProgress: 0,
            isIndeterminate: false,
            isError: true,
            errorMessage: 'Test error occurred',
            resetErrors: mockResetErrors,
        });

        render(<MemeField />);
        expect(screen.getByText('Test error occurred')).toBeInTheDocument();
    });

    test('renders progress bar when in progress', () => {
        useMemeStealer.mockReturnValue({
            stealMeme: mockStealMeme,
            isStealing: false,
            isDownloading: true,
            downloadProgress: 75,
            isIndeterminate: false,
            isError: false,
            errorMessage: null,
            resetErrors: mockResetErrors,
        });

        const { container } = render(<MemeField />);
        const progressFill = container.querySelector('.progress-fill');
        expect(progressFill).toBeInTheDocument();
        expect(progressFill).toHaveStyle('width: 75%');
    });

    test('renders zebra stripe loader when indeterminate progress is active', () => {
        useMemeStealer.mockReturnValue({
            stealMeme: mockStealMeme,
            isStealing: true,
            isDownloading: false,
            downloadProgress: 0,
            isIndeterminate: true,
            isError: false,
            errorMessage: null,
            resetErrors: mockResetErrors,
        });

        const { container } = render(<MemeField />);
        expect(container.querySelector('.zebra-fill')).toBeInTheDocument();
    });

    test('submits form with input value', () => {
        render(<MemeField />);
        const textarea = screen.getByPlaceholderText(/paste url here/i);
        fireEvent.change(textarea, {
            target: { value: 'https://youtube.com/watch?v=123' },
        });
        fireEvent.click(screen.getByRole('button', { name: /steal me/i }));

        expect(mockStealMeme).toHaveBeenCalledWith(
            'https://youtube.com/watch?v=123',
        );
    });

    test('resets form when reset button is clicked', () => {
        render(<MemeField />);
        const textarea = screen.getByPlaceholderText(/paste url here/i);
        fireEvent.change(textarea, {
            target: { value: 'https://youtube.com/watch?v=123' },
        });
        fireEvent.click(screen.getByRole('button', { name: /reset/i }));

        expect(textarea.value).toBe('');
        expect(mockResetErrors).toHaveBeenCalled();
    });
});
