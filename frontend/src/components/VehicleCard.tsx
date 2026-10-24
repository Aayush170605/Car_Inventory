import type { Vehicle } from '../types';
export type VehicleCardProps = {
  vehicle: Vehicle; admin: boolean; busy: boolean;
  onPurchase: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  onRestock: (vehicle: Vehicle) => void;
};
export function VehicleCard(_props: VehicleCardProps) { return <div />; }
