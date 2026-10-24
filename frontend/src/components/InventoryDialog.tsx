import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Vehicle, VehicleDetails } from '../types';

export type DialogAction = { kind: 'add' } | { kind: 'edit' | 'delete' | 'restock'; vehicle: Vehicle };
export function InventoryDialog({ action, onClose, onSave }: {
  action: DialogAction; onClose: () => void;
  onSave: (action: DialogAction, body?: VehicleDetails | (VehicleDetails & { quantity: number }) | { quantity: number }) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const vehicle = 'vehicle' in action ? action.vehicle : undefined;
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  const title = { add: 'Add a vehicle', edit: 'Edit vehicle', delete: 'Delete vehicle?', restock: 'Restock vehicle' }[action.kind];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    let body;
    if (action.kind === 'add' || action.kind === 'edit') {
      body = { make: String(data.get('make')).trim(), model: String(data.get('model')).trim(), category: String(data.get('category')).trim(), price: String(data.get('price')),
        ...(action.kind === 'add' ? { quantity: Number(data.get('quantity')) } : {}) };
    } else if (action.kind === 'restock') { body = { quantity: Number(data.get('quantity')) }; }
    setBusy(true); setError('');
    try { await onSave(action, body); onClose(); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="inventory-dialog" aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="dialog-heading"><h2 id="dialog-title">{title}</h2><button aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={22}/></button></div>
    {vehicle && <p className="muted">{vehicle.make} {vehicle.model} · {vehicle.quantity} in stock</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <form onSubmit={submit} className="form-stack">
      {(action.kind === 'add' || action.kind === 'edit') && <>
        <div className="form-pair"><label>Make<input name="make" defaultValue={vehicle?.make} maxLength={80} required/></label><label>Model<input name="model" defaultValue={vehicle?.model} maxLength={80} required/></label></div>
        <label>Category<input name="category" list="categories" defaultValue={vehicle?.category || 'Sedan'} required maxLength={80}/><datalist id="categories">{['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Truck', 'Electric'].map(c => <option key={c}>{c}</option>)}</datalist></label>
        <label>Price (USD)<input name="price" type="number" min="0" max="999999999" step="0.01" defaultValue={vehicle?.price} required/></label>
      </>}
      {(action.kind === 'add' || action.kind === 'restock') && <label>{action.kind === 'add' ? 'Initial stock' : 'Quantity to add'}<input name="quantity" type="number" min={action.kind === 'add' ? 0 : 1} max="1000000" step="1" defaultValue={action.kind === 'add' ? 0 : 1} required/></label>}
      {action.kind === 'edit' && <p className="field-hint">Use Restock to add inventory. Purchases reduce stock automatically.</p>}
      {action.kind === 'delete' && <p>This removes the vehicle from your collection. This action cannot be undone.</p>}
      <div className="dialog-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancel</button><button className={`button ${action.kind === 'delete' ? 'danger' : 'primary'}`} disabled={busy}>{busy ? 'Saving…' : action.kind === 'delete' ? 'Delete vehicle' : action.kind === 'restock' ? 'Add stock' : 'Save vehicle'}</button></div>
    </form>
  </dialog>;
}
