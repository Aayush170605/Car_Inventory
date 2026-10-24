import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CarFront, CheckCircle2, CircleDollarSign, LayoutGrid, LogOut, Package, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { ApiError, request } from './api';
import { AuthScreen } from './components/AuthScreen';
import { CarArt } from './components/CarArt';
import { InventoryDialog, type DialogAction } from './components/InventoryDialog';
import { VehicleCard, money } from './components/VehicleCard';
import type { Filters, Session, Vehicle, VehicleDetails } from './types';

const emptyFilters: Filters = { make: '', model: '', category: '', min_price: '', max_price: '' };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState('');
  if (!session) return <AuthScreen notice={notice} onLogin={value => { setSession(value); setNotice(''); }}/>;
  return <Inventory session={session} onLogout={(message = '') => { setSession(null); setNotice(message); }}/>;
}

function Inventory({ session, onLogout }: { session: Session; onLogout: (message?: string) => void }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sort, setSort] = useState('newest');
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [dialog, setDialog] = useState<DialogAction | null>(null);
  const generation = useRef(0);
  const purchaseLocks = useRef(new Set<number>());
  const admin = session.user.role === 'admin';
  const token = session.access_token;
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;
  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) logoutRef.current('Your session has expired. Please sign in again.');
    else setError((error as Error).message);
  }, []);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError('');
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value.trim() !== ''));
    try {
      const data = await request<Vehicle[]>(query.size ? `/vehicles/search?${query}` : '/vehicles', token);
      if (current === generation.current) setVehicles(data);
    } catch (error) { if (current === generation.current) handleError(error); }
    finally { if (current === generation.current) setLoading(false); }
  }, [filters, token, handleError]);
  useEffect(() => { void refresh(); return () => { generation.current++; }; }, [refresh]);

  async function purchase(vehicle: Vehicle) {
    if (purchaseLocks.current.has(vehicle.id)) return;
    purchaseLocks.current.add(vehicle.id);
    setPending(new Set(purchaseLocks.current)); setSuccess(''); setError('');
    try {
      const updated = await request<Vehicle>(`/vehicles/${vehicle.id}/purchase`, token, 'POST');
      setVehicles(items => items.map(item => item.id === updated.id ? updated : item));
      setSuccess(`Purchased one ${vehicle.make} ${vehicle.model}. ${updated.quantity} remaining.`);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) await refresh();
      handleError(error);
    } finally {
      purchaseLocks.current.delete(vehicle.id); setPending(new Set(purchaseLocks.current));
    }
  }
  async function save(action: DialogAction, body?: VehicleDetails | (VehicleDetails & { quantity: number }) | { quantity: number }) {
    setSuccess('');
    try {
      if (action.kind === 'add') await request('/vehicles', token, 'POST', body);
      else await request(`/vehicles/${action.vehicle.id}${action.kind === 'restock' ? '/restock' : ''}`, token,
        action.kind === 'delete' ? 'DELETE' : action.kind === 'edit' ? 'PUT' : 'POST', body);
      setSuccess({ add: 'Vehicle added to the collection.', edit: 'Vehicle details updated.', delete: 'Vehicle deleted.', restock: 'Stock updated successfully.' }[action.kind]);
      await refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) handleError(error);
      throw error;
    }
  }
  function applyFilters(event: FormEvent) {
    event.preventDefault();
    if (draft.min_price && draft.max_price && Number(draft.min_price) > Number(draft.max_price)) {
      setError('Minimum price cannot exceed maximum price.'); return;
    }
    setFilters({ ...draft });
  }
  const sorted = [...vehicles].sort((a, b) => sort === 'price-low' ? Number(a.price) - Number(b.price) : sort === 'price-high' ? Number(b.price) - Number(a.price) : b.id - a.id);
  const units = vehicles.reduce((sum, car) => sum + car.quantity, 0);
  const value = vehicles.reduce((sum, car) => sum + Math.round(Number(car.price) * 100) * car.quantity, 0) / 100;
  const filtered = Object.values(filters).some(Boolean);

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/"><CarFront size={27}/>motorlane<span>®</span></a>
      <div className="sidebar-menu"><span className="sidebar-label">YOUR WORKSPACE</span><div className="nav-active"><LayoutGrid size={18}/>Vehicle collection<span>{vehicles.length}</span></div></div>
      <div className="sidebar-bottom"><div className="sidebar-note"><span className="small-spark">✳</span><h3>Room for the<br/>road ahead.</h3><p>Great journeys start with the right set of wheels.</p></div><div className="account"><div className="avatar">{session.user.email[0].toUpperCase()}</div><div><strong>{admin ? 'Administrator' : 'Customer'}</strong><span title={session.user.email}>{session.user.email}</span></div><button aria-label="Sign out" title="Sign out" onClick={() => onLogout()}><LogOut size={17}/></button></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><span>Workspace <span className="crumb">/</span> <strong>Collection</strong></span><span className="access-badge"><i/>{admin ? 'Admin access' : 'Customer access'}</span></header>
      <section className="hero"><div><span className="eyebrow">THE MOTORLANE COLLECTION</span><h1>Find your next<br/><em>great drive.</em></h1><p>Explore the collection. Make your next move.</p><span className="hero-caption">A little possibility. A lot of open road. <ArrowRight size={15}/></span></div><div className="hero-art"><span className="hero-orbit"/><CarArt color="#779b83"/><span className="hero-art-label">CURATED FOR THE ROAD AHEAD</span></div></section>
      <section className="stats" aria-label="Inventory summary">
        <div className="stat"><span className="stat-icon"><CarFront size={21}/></span><div><span>Vehicle models{filtered ? ' · filtered' : ''}</span><strong>{loading ? '—' : vehicles.length.toString().padStart(2, '0')}</strong></div><small>In the collection</small></div>
        <div className="stat"><span className="stat-icon"><Package size={21}/></span><div><span>Available units{filtered ? ' · filtered' : ''}</span><strong>{loading ? '—' : units.toString().padStart(2, '0')}</strong></div><small>Ready to go</small></div>
        <div className="stat"><span className="stat-icon"><CircleDollarSign size={21}/></span><div><span>Inventory value{filtered ? ' · filtered' : ''}</span><strong className="value">{loading ? '—' : money(value)}</strong></div><small>At listed prices</small></div>
      </section>
      <section className="collection-section">
        <div className="section-heading"><div><h2>Your next chapter, on wheels.</h2><p className="muted">Browse, compare, and find the one.</p></div>{admin && <button className="button primary" onClick={() => setDialog({ kind: 'add' })}><Plus size={17}/>Add vehicle</button>}</div>
        <form className="filter-panel" onSubmit={applyFilters}>
          <div className="filter-label"><SlidersHorizontal size={16}/><strong>Refine your search</strong></div>
          <div className="filter-fields">
            <label>Make<input value={draft.make} maxLength={80} placeholder="Any make" onChange={e => setDraft({ ...draft, make: e.target.value })}/></label>
            <label>Model<input value={draft.model} maxLength={80} placeholder="Any model" onChange={e => setDraft({ ...draft, model: e.target.value })}/></label>
            <label>Category<input value={draft.category} maxLength={80} placeholder="All categories" onChange={e => setDraft({ ...draft, category: e.target.value })}/></label>
            <label>Min price ($)<input type="number" min="0" max="999999999" step="0.01" value={draft.min_price} placeholder="0" onChange={e => setDraft({ ...draft, min_price: e.target.value })}/></label>
            <label>Max price ($)<input type="number" min="0" max="999999999" step="0.01" value={draft.max_price} placeholder="No limit" onChange={e => setDraft({ ...draft, max_price: e.target.value })}/></label>
            <button className="button primary" type="submit"><Search size={16}/>Search</button>
          </div>
        </form>
        <div className="results-toolbar"><span>{loading ? 'Loading collection…' : `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'} ${filtered ? 'found' : 'in the collection'}`}{filtered && <button className="text-button" onClick={() => { setDraft(emptyFilters); setFilters(emptyFilters); }}>Clear filters</button>}</span><label>Sort by <select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest added</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div>
        {error && <div className="error" role="alert">{error}<button className="text-button" onClick={() => void refresh()}>Refresh collection</button></div>}
        {success && <div className="success" role="status"><CheckCircle2 size={18}/>{success}<button aria-label="Dismiss notification" onClick={() => setSuccess('')}>×</button></div>}
        {loading ? <div className="loading-grid" aria-label="Loading vehicles">{[1,2,3].map(i => <div className="skeleton" key={i}/>)}</div> : sorted.length ? <div className="vehicle-grid">{sorted.map(vehicle => <VehicleCard key={vehicle.id} vehicle={vehicle} admin={admin} busy={pending.has(vehicle.id)} onPurchase={purchase} onEdit={vehicle => setDialog({ kind: 'edit', vehicle })} onDelete={vehicle => setDialog({ kind: 'delete', vehicle })} onRestock={vehicle => setDialog({ kind: 'restock', vehicle })}/>)}</div> : <div className="empty-state"><CarFront size={40}/><h3>{filtered ? 'No vehicles match your search.' : 'A fresh start for your collection.'}</h3><p>{filtered ? 'Try a different make, model, or price range.' : admin ? 'Add your first vehicle to get started.' : 'New vehicles will appear here when they are added.'}</p>{filtered && <button className="button secondary" onClick={() => { setDraft(emptyFilters); setFilters(emptyFilters); }}>Reset search</button>}</div>}
      </section>
      <footer>motorlane<span>Good cars. Great beginnings.</span><small>Prices shown in USD · Illustrations are for display only</small></footer>
    </main>
    {dialog && <InventoryDialog action={dialog} onClose={() => setDialog(null)} onSave={save}/>}
  </div>;
}
