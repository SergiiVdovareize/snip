import { render, screen } from '@testing-library/react';
import App from './App';

test('renders steal button', () => {
    render(<App />);
    const buttonElement = screen.getByRole('button', { name: /steal me/i });
    expect(buttonElement).toBeInTheDocument();
});
