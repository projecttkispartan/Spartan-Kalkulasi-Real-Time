import { moneyClass } from '../../design/moneyStyles.js';

/**
 * Teks nominal dengan warna konsisten (MAT / PROD / UNIT / proses).
 */
export function MoneyText({ variant = 'matIdr', className = '', as: Tag = 'span', children }) {
  return <Tag className={moneyClass(variant, className)}>{children}</Tag>;
}
