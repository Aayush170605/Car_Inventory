export type User = { id: number; email: string; role: 'admin' | 'customer' };
export type Session = { access_token: string; token_type: string; user: User };
export type Vehicle = { id: number; make: string; model: string; category: string; price: string; quantity: number };
export type VehicleDetails = Omit<Vehicle, 'id' | 'quantity'>;
export type Filters = { make: string; model: string; category: string; min_price: string; max_price: string };
