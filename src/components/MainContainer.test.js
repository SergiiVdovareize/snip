import { render, screen } from '@testing-library/react';
import MainContainer from './MainContainer';

jest.mock('./MemeField', () => () => (
    <div data-testid="mock-meme-field">Meme Field</div>
));

describe('MainContainer Component', () => {
    test('renders MemeField component', () => {
        render(<MainContainer />);
        expect(screen.getByTestId('mock-meme-field')).toBeInTheDocument();
    });
});
