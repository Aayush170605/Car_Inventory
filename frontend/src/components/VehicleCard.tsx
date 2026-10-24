import type { Vehicle } from '../types';
import { ArrowUpRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { CarArt } from './CarArt';
export type VehicleCardProps = {
  vehicle: Vehicle; admin: boolean; busy: boolean;
  onPurchase: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  onRestock: (vehicle: Vehicle) => void;
};
const colors = ['#547d70', '#7793a1', '#bb9f80', '#8c9690', '#a77861', '#66717e'];
export const money = (value: string | number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(value));

export function VehicleCard({ vehicle, admin, busy, onPurchase, onEdit, onDelete, onRestock }: VehicleCardProps) {
  return <article className="vehicle-card">
    <div className="vehicle-visual">
      <span className="category-tag">{vehicle.category}</span>
      <span className={`stock-tag ${vehicle.quantity === 0 ? 'sold' : ''}`}><i/>{vehicle.quantity === 0 ? 'Sold out' : `${vehicle.quantity} in stock`}</span>
      <CarArt color={colors[(vehicle.id - 1) % colors.length]} suv={/suv|truck/i.test(vehicle.category)}/>
    </div>
    <div className="vehicle-info">
      <p className="eyebrow">{vehicle.make}</p>
      <div className="vehicle-title"><h3>{vehicle.model}</h3><span className="vehicle-id">#{String(vehicle.id).padStart(3, '0')}</span></div>
      <div className="price-row"><strong>{money(vehicle.price)}</strong><span>per vehicle</span></div>
      <button className="button primary purchase-button" disabled={!vehicle.quantity || busy} onClick={() => onPurchase(vehicle)}>
        {busy ? 'Purchasing…' : vehicle.quantity === 0 ? 'Out of stock' : 'Purchase'}{vehicle.quantity > 0 && !busy && <ArrowUpRight size={17}/>}
      </button>
      {admin && <div className="admin-actions">
        <button disabled={busy} onClick={() => onEdit(vehicle)}><Pencil size={14}/>Edit</button>
        <button disabled={busy} onClick={() => onRestock(vehicle)}><Plus size={14}/>Restock</button>
        <button disabled={busy} className="delete-action" aria-label={`Delete ${vehicle.make} ${vehicle.model}`} onClick={() => onDelete(vehicle)}><Trash2 size={14}/></button>
      </div>}
    </div>
  </article>;
}
