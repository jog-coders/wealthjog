import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import EnumManager from './EnumManager';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [importData, setImportData] = useState(null);
  const fileInputRef = useRef(null);

  // Family sharing state
  const [familyEmail, setFamilyEmail] = useState('');
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyLoading, setFamilyLoading] = useState(false);

  const { get, post, del } = useApi();
  const { refreshAll } = useAppContext();
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
    const { data, error } = await get('/api/settings/export');
    if (error) {
      toast.error('Failed to export data');
      return;
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wealthjog_backup_${new Date().toISOString().split('T')[0]}.json`;
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
        if (!json.version || !json.data) {
          throw new Error('Invalid backup file format');
        }
        setImportData(json);
        setIsImportConfirmOpen(true);
      } catch (err) {
        toast.error('Failed to read backup file: ' + err.message);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setIsImportConfirmOpen(false);
    if (!importData) return;

    const toastId = toast.loading('Restoring data...');
    const { error } = await post('/api/settings/import', importData);
    
    if (error) {
      toast.error('Failed to restore data', { id: toastId });
    } else {
      toast.success('Data restored successfully', { id: toastId });
      refreshAll();
      navigate('/dashboard');
    }
    setImportData(null);
  };

  const handleClearData = async () => {
    setIsConfirmOpen(false);
    const { error } = await del('/api/settings/all-data');
    if (!error) {
      refreshAll();
      navigate('/budget');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="page-title">Settings</h1>
      
      <EnumManager domain="asset_type" label="Asset" />
      <EnumManager domain="liability_type" label="Liability" />

      <div className="bg-white border border-gray-100 rounded-xl">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Data Management</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Backup all your financial data to a JSON file, or restore your data from a previous backup.</p>
          </div>
          <div className="mt-5 flex gap-4">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              Export Data
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
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              Restore Data
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

      <ConfirmDialog
        open={isImportConfirmOpen}
        title="Restore Data"
        message="This will completely overwrite your existing data with the contents of the backup file. Are you sure you want to proceed?"
        onConfirm={handleImport}
        onCancel={() => setIsImportConfirmOpen(false)}
      />
    </div>
  );
}
