import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App';

const session = { access_token: 'test-token', token_type: 'bearer', user: { id: 1, email: 'customer@example.com', role: 'customer' } };
const cars = [{ id: 1, make: 'Toyota', model: 'Camry', category: 'Sedan', price: '25000.00', quantity: 2 }];
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status }); }
async function signIn() {
  await userEvent.type(screen.getByLabelText('Email address'), 'customer@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'BrowserTestPassword123!');
  await userEvent.click(screen.getAllByRole('button', { name: 'Sign in' })[1]);
  await screen.findByRole('heading', { name: 'Camry' });
}
afterEach(() => vi.unstubAllGlobals());

it('returns to sign-in when a purchase discovers an expired session', async () => {
  vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(
    url.endsWith('/login') ? json(session) : url.endsWith('/purchase') ? json({ detail: 'Expired' }, 401) : json(cars)
  )));
  render(<App/>);
  await signIn();
  await userEvent.click(screen.getByRole('button', { name: 'Purchase' }));
  await screen.findByRole('heading', { name: 'Welcome back.' });
  expect(screen.getByRole('status')).toHaveTextContent('Your session has expired');
});

it('refreshes stale stock after a rejected purchase and explains the conflict', async () => {
  let purchased = false;
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.endsWith('/login')) return Promise.resolve(json(session));
    if (url.endsWith('/purchase')) { purchased = true; return Promise.resolve(json({ detail: 'This vehicle is out of stock' }, 409)); }
    return Promise.resolve(json(purchased ? [{ ...cars[0], quantity: 0 }] : cars));
  }));
  render(<App/>);
  await signIn();
  await userEvent.click(screen.getByRole('button', { name: 'Purchase' }));
  expect(await screen.findByRole('button', { name: 'Out of stock' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('This vehicle is out of stock');
});

it('validates reversed price ranges before submitting a search', async () => {
  const fetchMock = vi.fn((url: string) => Promise.resolve(url.endsWith('/login') ? json(session) : json(cars)));
  vi.stubGlobal('fetch', fetchMock);
  render(<App/>);
  await signIn();
  await userEvent.type(screen.getByLabelText('Min price ($)'), '100');
  await userEvent.type(screen.getByLabelText('Max price ($)'), '10');
  await userEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Minimum price cannot exceed maximum price');
  expect(fetchMock.mock.calls.some(([url]) => url.includes('/search'))).toBe(false);
});
