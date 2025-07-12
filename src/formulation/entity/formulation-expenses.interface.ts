export interface FormulationExpenses {
  expense_account_id: number;
  quantityRequired: number;
  name: string;
  perUnit: number;
  details?: string;
  amount: number;
}
