export interface FormulationProduct {
  product_id: number;
  name: string;
  description?: string;
  unit: string;
  qtyFiPercent?: number;
  baseQuantity: number;
  costFiPercent: number;
  quantityRequired: number;
}
