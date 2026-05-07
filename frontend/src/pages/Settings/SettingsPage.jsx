import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import EnumManager from './EnumManager';
import { useRef } from 'react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [importData, setImportData] = useState(null);
  const fileInputRef = useRef(null);

  const { get, post, del } = useApi();
  const { refreshAll } = useAppContext();
  const navigate = useNavigate();

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
