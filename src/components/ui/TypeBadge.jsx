import { tipeStyles } from '../../design/tipeStyles';

export default function TypeBadge({ tipe, size = 'sm' }) {
  const style = tipeStyles[tipe] || tipeStyles.PART;
  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded font-black tracking-wide uppercase border ${sizeClass} ${style.pill}`}>
      {tipe}
    </span>
  );
}
