import { formatCurrency } from '../utils/formatCurrency';
import PercentBadge from './PercentBadge';

export default function AutoInjectedRow({ category, amount, percentOfTotal, isTeal = false }) {
  return (
    <tr className={`${isTeal ? 'bg-teal-50 border-teal-200' : 'bg-gray-50 border-gray-200'} border-b`}>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 flex items-center">
        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        {category}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
        {formatCurrency(amount)}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
        <PercentBadge percent={percentOfTotal} />
      </td>
      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
        {/* Empty action cell for alignment */}
      </td>
    </tr>
  );
}
