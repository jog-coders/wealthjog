import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import LookupManager from './LookupManager';
import VendorRulesManager from './VendorRulesManager';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [importData, setImportData] = useState(null);
  const fileInputRef = useRef(null);

  // Modular export / restore selections
  const [exportModules, setExportModules] = useState({
    budget: true,
    ledger: true,
    rentals: true,
    balance_sheet: true,
  });
  const [importModules, setImportModules] = useState({
    budget: false,
    ledger: false,
    rentals: false,
    balance_sheet: false,
  });
  const [availableImportModules, setAvailableImportModules] = useState([]);

  // Family sharing state
  const [familyEmail, setFamilyEmail] = useState('');
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyLoading, setFamilyLoading] = useState(false);

  const { get, post, del } = useApi();
  const navigate = useNavigate();

  useEffect(() => {
    get('/api/settings/family-members').then(({ data }) => {
      if (data) setFamilyMembers(data);
    });
  }, []);

  const handleInviteFamily = async (e) => {
    e.preventDefault();
    if (!familyEmail) return;
    setFamilyLoading(true);
    const { data, error } = await post('/api/settings/invite-family', { email: familyEmail });
    setFamilyLoading(false);
    if (!error && data) {
      toast.success(data.message);
      setFamilyEmail('');
      // Refresh members list
      const { data: members } = await get('/api/settings/family-members');
      if (members) setFamilyMembers(members);
    }
  };

  const handleRemoveMember = async (memberId, email) => {
    if (!window.confirm(`Remove ${email} from family sharing?`)) return;
    const { error } = await del(`/api/settings/family-members/${memberId}`);
    if (!error) {
      setFamilyMembers(prev => prev.filter(m => m.id !== memberId));
    }
  };

  const handleExport = async () => {
    const selected = Object.keys(exportModules).filter(k => exportModules[k]);
    if (selected.length === 0) {
      toast.error('Please select at least one module to export');
      return;
    }
    const { data, error } = await get(`/api/settings/export?modules=${selected.join(',')}`);
    if (error) {
      toast.error('Failed to export data');
      return;
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wealthjog_backup_${selected.join('_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json.version || !json.data || typeof json.data !== 'object') {
          throw new Error('Invalid backup file format. Missing version or data object.');
        }

        // Detect available modules in this backup file
        const available = [];
        if (json.data.budget_categories || json.data.income_sources) available.push('budget');
        if (json.data.transactions || json.data.vendor_rules) available.push('ledger');
        if (json.data.properties || json.data.property_snapshots) available.push('rentals');
        if (json.data.balance_sheet_accounts || json.data.user_lookup_values) available.push('balance_sheet');

        if (available.length === 0) {
          throw new Error('No valid financial module data found in the backup file.');
        }

        setImportData(json);
        setAvailableImportModules(available);

        // Check all available modules by default
        const initialCheck = { budget: false, ledger: false, rentals: false, balance_sheet: false };
        available.forEach(m => { initialCheck[m] = true; });
        setImportModules(initialCheck);

        setIsImportConfirmOpen(true);
      } catch (err) {
        toast.error('Failed to read backup file: ' + err.message, { duration: 6000 });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setIsImportConfirmOpen(false);
    if (!importData) return;

    const selected = Object.keys(importModules).filter(k => importModules[k]);
    if (selected.length === 0) {
      toast.error('Please select at least one module to restore');
      return;
    }

    // Final client-side schema confirmation before calling import
    for (const m of selected) {
      if (m === 'budget' && (!importData.data.budget_categories || !importData.data.income_sources)) {
        toast.error('Data error: Missing budget categories or income sources.');
        return;
      }
      if (m === 'ledger' && (!importData.data.transactions || !importData.data.vendor_rules)) {
        toast.error('Data error: Missing transactions or vendor match rules.');
        return;
      }
      if (m === 'rentals' && (!importData.data.properties || !importData.data.property_snapshots)) {
        toast.error('Data error: Missing properties or snapshots.');
        return;
      }
      if (m === 'balance_sheet' && (!importData.data.balance_sheet_accounts || !importData.data.user_lookup_values)) {
        toast.error('Data error: Missing balance sheet accounts or lookup settings.');
        return;
      }
    }

    const toastId = toast.loading('Restoring data...');
    const { error } = await post('/api/settings/import', {
      data: importData.data,
      modules: selected
    });
    
    if (error) {
      toast.error(error.message || 'Failed to restore data', { id: toastId });
    } else {
      toast.success('Data restored successfully', { id: toastId });
      navigate('/dashboard');
    }
    setImportData(null);
  };

  const handleClearData = async () => {
    setIsConfirmOpen(false);
    const { error } = await del('/api/settings/all-data');
    if (!error) {
      navigate('/budget');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="page-title">Settings</h1>
      
      <LookupManager
        domain="asset_type"
        title="Asset Types"
        description="Customize the types shown in the Asset dropdown. You can rename existing types or add new ones (mapped to a base DB type)."
      />
      <LookupManager
        domain="liability_type"
        title="Liability Types"
        description="Customize the types shown in the Liability dropdown."
      />
      <LookupManager
        domain="institution"
        title="Institutions"
        description="Manage your list of financial institutions (banks, brokerages, etc.). These appear as dropdown options on Asset and Liability forms."
      />
      <VendorRulesManager categories={[]} />

      <div className="bg-white border border-gray-100 rounded-xl">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Data Management</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Backup or restore your financial data. You can choose to export or restore specific modules with cascading constraints resolved automatically.</p>
          </div>

          {/* Module selection for export */}
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select Modules to Export:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { key: 'budget', label: 'Budget Data', desc: 'Envelopes & incomes' },
                { key: 'ledger', label: 'Ledger Data', desc: 'Spending & rules' },
                { key: 'rentals', label: 'Rental Data', desc: 'Properties & history' },
                { key: 'balance_sheet', label: 'Assets & Liabilities', desc: 'Accounts & lookups' },
              ].map(mod => (
                <label
                  key={mod.key}
                  className={`flex flex-col p-3 border rounded-xl cursor-pointer select-none transition-all ${
                    exportModules[mod.key]
                      ? 'border-primary-500 bg-primary-50/10 ring-1 ring-primary-500'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportModules[mod.key]}
                      onChange={() => setExportModules(prev => ({ ...prev, [mod.key]: !prev[mod.key] }))}
                      className="rounded text-primary-600 focus:ring-primary-500 border-gray-300 h-4 w-4"
                    />
                    <span className="text-xs font-bold text-gray-800">{mod.label}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 leading-normal">{mod.desc}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleExport}
              disabled={Object.values(exportModules).filter(Boolean).length === 0}
              className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50 shadow-sm"
            >
              Export Selected Data
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".json"
              onChange={handleFileChange} 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              Restore Data (Upload File)
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Account Security</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Update your password. This is especially important if you were invited via a magic link and haven't set a password yet.</p>
          </div>
          <form className="mt-5 sm:flex sm:items-center" onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target;
            const newPassword = form.password.value;
            if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
            
            const toastId = toast.loading('Updating password...');
            const { error } = await import('../../supabaseClient').then(m => m.supabase.auth.updateUser({ password: newPassword }));
            
            if (error) {
              toast.error(error.message, { id: toastId });
            } else {
              toast.success('Password updated successfully!', { id: toastId });
              form.reset();
            }
          }}>
            <div className="w-full sm:max-w-xs">
              <label htmlFor="password" className="sr-only">New Password</label>
              <input type="password" name="password" id="password" required className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" placeholder="New Password" />
            </div>
            <button type="submit" className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 sm:ml-3 sm:mt-0 sm:w-auto">Update Password</button>
          </form>
        </div>
      </div>

      {/* Family Sharing */}
      <div className="bg-white border border-gray-100 rounded-xl">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">👨‍👩‍👧 Family Sharing</h3>
          <div className="mt-1 max-w-xl text-sm text-gray-500">
            <p>Invite family members so they can access and manage the same financial data.</p>
          </div>

          {/* Invite form */}
          <form onSubmit={handleInviteFamily} className="mt-5 sm:flex sm:items-center gap-3">
            <div className="w-full sm:max-w-xs">
              <label htmlFor="familyEmail" className="sr-only">Email address</label>
              <input
                id="familyEmail"
                type="email"
                required
                value={familyEmail}
                onChange={e => setFamilyEmail(e.target.value)}
                placeholder="family@example.com"
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
              />
            </div>
            <button
              type="submit"
              disabled={familyLoading}
              className="mt-3 sm:mt-0 inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
            >
              {familyLoading ? 'Sending…' : 'Send Invite'}
            </button>
          </form>

          {/* Current members */}
          {familyMembers.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Active Members</p>
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                {familyMembers.map(member => (
                  <li key={member.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-gray-800">{member.email}</span>
                    <button
                      onClick={() => handleRemoveMember(member.id, member.email)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-red-900">Danger Zone</h3>
          <div className="mt-2 max-w-xl text-sm text-red-700">
            <p>This will permanently delete all your financial data. This cannot be undone.</p>
          </div>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className="inline-flex items-center rounded-lg border border-red-600 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
            >
              Clear All Data
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Future Modules</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Investment Tracker, Tax Planner, and Goals can be added here as this application grows.</p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        title="Clear All Data"
        message="This will permanently delete all your financial data. This cannot be undone."
        onConfirm={handleClearData}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {isImportConfirmOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={() => { setIsImportConfirmOpen(false); setImportData(null); }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
          <div style={{
            position: 'relative', zIndex: 1,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 18, padding: '28px',
            width: '100%', maxWidth: 540,
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}>
            <div className="flex items-start gap-4 mb-4">
              <div style={{
                flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(0,210,142,0.10)',
                border: '1px solid rgba(0,210,142,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#00D28E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-100">Restore Financial Backup</h3>
                <p className="text-xs text-gray-400 mt-1 leading-normal">
                  Configure which modules to restore from the selected backup file. Replaced modules will overwrite existing database records.
                </p>
              </div>
            </div>

            {/* Backup File Metadata */}
            <div className="bg-[#0F172A]/50 border border-[#334155]/50 rounded-xl p-3 mb-4 text-xs space-y-1.5">
              <p className="text-gray-400">
                <b className="text-gray-300">Backup Date:</b> {importData?.exportDate ? new Date(importData.exportDate).toLocaleString() : 'N/A'}
              </p>
              <p className="text-gray-400">
                <b className="text-gray-300">Schema Version:</b> v{importData?.version || 'N/A'}
              </p>
              <p className="text-gray-400">
                <b className="text-gray-300">Original Modules:</b> {importData?.modules?.join(', ') || 'N/A'}
              </p>
            </div>

            {/* Restore Checklist */}
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2.5">Select Modules to Restore:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {[
                { key: 'budget', label: 'Budget Data', desc: 'Overwrites envelopes & budgets' },
                { key: 'ledger', label: 'Ledger Data', desc: 'Overwrites spending logs & match rules' },
                { key: 'rentals', label: 'Rental Data', desc: 'Overwrites properties & snap history' },
                { key: 'balance_sheet', label: 'Assets & Liabilities', desc: 'Overwrites assets & type configurations' },
              ].map(mod => {
                const isAvailable = availableImportModules.includes(mod.key);
                return (
                  <label
                    key={mod.key}
                    className={`flex flex-col p-3 border rounded-xl transition-all select-none ${
                      !isAvailable
                        ? 'border-slate-800 bg-slate-900/50 opacity-40 cursor-not-allowed'
                        : importModules[mod.key]
                        ? 'border-[#00D28E] bg-[#00D28E]/5 ring-1 ring-[#00D28E] cursor-pointer'
                        : 'border-slate-700 bg-slate-800/40 hover:bg-slate-800/80 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        disabled={!isAvailable}
                        checked={importModules[mod.key]}
                        onChange={() => setImportModules(prev => ({ ...prev, [mod.key]: !prev[mod.key] }))}
                        className="rounded text-[#00D28E] focus:ring-[#00D28E] border-slate-600 h-4 w-4 bg-slate-900 disabled:opacity-50"
                      />
                      <span className={`text-xs font-bold ${isAvailable ? 'text-gray-200' : 'text-gray-500'}`}>
                        {mod.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 leading-normal">
                      {isAvailable ? mod.desc : '(Not present in backup file)'}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-3.5 justify-end">
              <button
                onClick={() => { setIsImportConfirmOpen(false); setImportData(null); }}
                className="px-4 py-2 border border-slate-700 hover:bg-slate-800 rounded-lg text-xs font-semibold text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={Object.values(importModules).filter(Boolean).length === 0}
                className="px-4 py-2 bg-[#00D28E] hover:bg-[#00D28E]/90 disabled:opacity-50 rounded-lg text-xs font-semibold text-slate-950 shadow-sm"
              >
                Restore Selected Data
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
