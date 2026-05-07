import AssetsTable from './AssetsTable';
import LiabilitiesTable from './LiabilitiesTable';
import AssetsLiabilitiesVisuals from './AssetsLiabilitiesVisuals';

export default function AssetsLiabilitiesPage() {
  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h2 className="section-title mb-5">Assets</h2>
        <AssetsTable />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h2 className="section-title mb-5">Liabilities</h2>
        <LiabilitiesTable />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h2 className="section-title mb-5">Net Worth Snapshot</h2>
        <AssetsLiabilitiesVisuals />
      </div>
    </div>
  );
}
