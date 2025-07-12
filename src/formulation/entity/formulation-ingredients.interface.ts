export interface FormulationIngredient {
  inventory_item_id: number;
  description?: string;
  quantityRequired: number;
  availableQuantity: number;
  amount: number;
  name: string;
  perUnit: number;
  unit: string;
}
