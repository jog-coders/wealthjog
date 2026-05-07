import { useExpenses } from '../../hooks/useExpenses';
import { formatCurrency } from '../../utils/formatCurrency';

export default function OverspendAlerts() {
  const { overspendAlerts } = useExpenses();

  if (!overspendAlerts || overspendAlerts.length === 0) return null;

  return (
    <div className="space-y-4">
      {overspendAlerts.map((alert, idx) => {
        const isAnnual = alert.type === 'annual';
        const bgClass = isAnnual ? 'bg-red-50' : 'bg-yellow-50';
        const borderClass = isAnnual ? 'border-red-400' : 'border-yellow-400';
        const textClass = isAnnual ? 'text-red-800' : 'text-yellow-800';
        const iconClass = isAnnual ? 'text-red-400' : 'text-yellow-400';

        const message = isAnnual
          ? `🚨 ${alert.category} has exceeded its annual budget by ${formatCurrency(alert.over)}`
          : `⚠ ${alert.category} is over monthly budget by ${formatCurrency(alert.over)}`;

        return (
          <div key={idx} className={`border-l-4 p-4 ${bgClass} ${borderClass}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {isAnnual ? (
                  <svg className={`h-5 w-5 ${iconClass}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className={`h-5 w-5 ${iconClass}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${textClass}`}>
                  {message}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
