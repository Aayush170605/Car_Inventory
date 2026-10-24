import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { VehicleCard, type VehicleCardProps } from './VehicleCard';

const car = { id: 1, make: 'Toyota', model: 'Camry', category: 'Sedan', price: '25000.99', quantity: 2 };
function props(overrides: Partial<VehicleCardProps> = {}): VehicleCardProps {
  return { vehicle: car, admin: false, busy: false, onPurchase: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onRestock: vi.fn(), ...overrides };
}
describe('VehicleCard', () => {
  it('disables purchases when stock is zero', () => {
    render(<VehicleCard {...props({ vehicle: { ...car, quantity: 0 } })} />);
    expect(screen.getByRole('button', { name: /out of stock/i })).toBeDisabled();
  });
  it('submits one purchase and disables it while pending', async () => {
    const p = props();
    const { rerender } = render(<VehicleCard {...p} />);
    await userEvent.click(screen.getByRole('button', { name: /purchase/i }));
    expect(p.onPurchase).toHaveBeenCalledExactlyOnceWith(car);
    rerender(<VehicleCard {...p} busy />);
    expect(screen.getByRole('button', { name: /purchasing/i })).toBeDisabled();
  });
  it('hides management controls from customers', () => {
    render(<VehicleCard {...props()} />);
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /restock/i })).not.toBeInTheDocument();
  });
  it('lets admins edit, restock and delete a vehicle', async () => {
    const p = props({ admin: true });
    render(<VehicleCard {...p} />);
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await userEvent.click(screen.getByRole('button', { name: /restock/i }));
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(p.onEdit).toHaveBeenCalledWith(car);
    expect(p.onRestock).toHaveBeenCalledWith(car);
    expect(p.onDelete).toHaveBeenCalledWith(car);
  });
});
