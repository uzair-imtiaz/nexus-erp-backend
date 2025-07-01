export interface FormulationProduct {
  product_id: number;
  description?: string;
  unit: string;
  qtyFiPercent?: number;
  baseQuantity: number;
  costFiPercent: number;
  quantityRequired: number;
}
