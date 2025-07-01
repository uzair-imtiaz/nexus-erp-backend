export interface FormulationIngredient {
  inventory_item_id: number;
  description?: string;
  quantityRequired: number;
  perUnit: number;
  unit: string;
}
