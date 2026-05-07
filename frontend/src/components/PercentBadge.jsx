export default function PercentBadge({ percent }) {
  const formatted = (Number(percent) || 0).toFixed(2);
  
  return (
    <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-800">
      {formatted}%
    </span>
  );
}
