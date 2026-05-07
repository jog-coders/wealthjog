import { formatCurrency } from '../utils/formatCurrency';

export default function RunningTotal({ label = "Running Total", amount, extraInfo }) {
  return (
    <div className="bg-white px-4 py-5 sm:p-6 rounded-xl border border-gray-100 flex items-center justify-between">
      <div>
        <h3 className="text-base font-semibold leading-6 text-gray-900">{label}</h3>
        {extraInfo && <p className="mt-1 text-sm text-gray-500">{extraInfo}</p>}
      </div>
      <div className="text-2xl font-bold tracking-tight text-primary-500">
        {formatCurrency(amount)}
      </div>
    </div>
  );
}
