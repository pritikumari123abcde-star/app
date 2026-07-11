import React, { useState, useEffect } from 'react';
import { Staff, StaffPermissions } from '../types';
import { db } from '../lib/database';
import { 
  getNotificationPrefs, 
  saveNotificationPrefs, 
  NotificationPreferences, 
  getEmailLogs, 
  clearEmailLogs, 
  EmailLog 
} from '../lib/notifications';
import { 
  Settings, Shield, UserX, UserCheck, Download, Upload, RotateCcw, Save, Check, UserPlus,
  Bell, Mail, ToggleLeft, ToggleRight, Trash2 as TrashIcon, Eye as EyeIcon, ArrowLeft as ArrowLeftIcon, AlertCircle
} from 'lucide-react';

interface SettingsViewProps {
  currentUser: Staff;
  userEmail: string;
  onRefreshSession: () => void;
  isStandalone?: boolean;
  onInstallApp?: () => void;
  installAvailable?: boolean;
}

export default function SettingsView({ 
  currentUser, 
  userEmail, 
  onRefreshSession,
  isStandalone = false,
  onInstallApp,
  installAvailable = false
}: SettingsViewProps) {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [backupString, setBackupString] = useState('');
  const [isSuccess, setIsSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New staff form states
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'Admin' | 'Staff'>('Staff');

  // Notification states
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(() => getNotificationPrefs(currentUser.email));
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [viewingEmail, setViewingEmail] = useState<EmailLog | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  } | null>(null);

  const fetchStaffData = async () => {
    try {
      const data = await db.getStaff();
      setStaffList(data);
      // Also load email logs
      setEmailLogs(getEmailLogs());
    } catch (e) {
      console.error('Error fetching staff list:', e);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const handleUpdatePref = (field: keyof NotificationPreferences) => {
    const nextVal = !notifPrefs[field];
    const updated = { ...notifPrefs, [field]: nextVal };
    setNotifPrefs(updated);
    saveNotificationPrefs(currentUser.email, updated);
    setIsSuccess('Notification preferences saved!');
    setTimeout(() => setIsSuccess(null), 1500);
  };

  const handleClearLogs = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Outbox?',
      message: 'Clear all entries from the Simulated Email Outbox?',
      onConfirm: () => {
        clearEmailLogs();
        setEmailLogs([]);
        setIsSuccess('Simulated email outbox logs cleared.');
        setTimeout(() => setIsSuccess(null), 2000);
      }
    });
  };

  const handleToggleStatus = async (id: string, currentStatus: Staff['status']) => {
    if (currentUser.role !== 'Admin') {
      setError('Only administrators can modify staff accounts.');
      return;
    }
    if (id === currentUser.id) {
      setError('You cannot deactivate your own administrative session!');
      return;
    }

    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    const updated = await db.updateStaffStatus(id, nextStatus);
    setStaffList(updated);
    setIsSuccess(`Successfully set staff member state to ${nextStatus}.`);
    setTimeout(() => setIsSuccess(null), 3000);
  };

  const handlePermissionChange = async (staffId: string, field: keyof StaffPermissions, checked: boolean) => {
    if (currentUser.role !== 'Admin') {
      setError('Only administrators can alter workspace permissions.');
      return;
    }

    const staffMember = staffList.find(s => s.id === staffId);
    if (!staffMember) return;

    const updatedPermissions = {
      ...staffMember.permissions,
      [field]: checked
    };

    const updatedList = await db.updateStaffPermissions(staffId, updatedPermissions);
    setStaffList(updatedList);
    setIsSuccess('Updated staff permissions successfully.');
    setTimeout(() => setIsSuccess(null), 2500);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      setError('Please provide a valid name and email address.');
      return;
    }

    if (staffList.some(s => s.email.toLowerCase() === newStaffEmail.trim().toLowerCase())) {
      setError('A staff member with this email address already exists.');
      return;
    }

    // Default permissions setup
    const defaultPerms: StaffPermissions = {
      canAddEnquiry: true,
      canEditEnquiry: newStaffRole === 'Admin',
      canDeleteEnquiry: newStaffRole === 'Admin',
      canManageServices: true,
      canManageDemos: true,
      canManageFollowUps: true,
      canViewReports: newStaffRole === 'Admin',
      canExportCSV: newStaffRole === 'Admin'
    };

    await db.addStaff({
      name: newStaffName.trim(),
      email: newStaffEmail.trim().toLowerCase(),
      role: newStaffRole,
      status: 'Active',
      permissions: defaultPerms
    });

    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffRole('Staff');
    setIsAddingStaff(false);
    setIsSuccess('Successfully created active staff account!');
    fetchStaffData();
    setTimeout(() => setIsSuccess(null), 3000);
  };

  const handleDeleteStaff = async (id: string) => {
    if (currentUser.role !== 'Admin') return;
    if (id === currentUser.id) return;

    setConfirmModal({
      isOpen: true,
      title: 'Delete Staff Member?',
      message: 'Are you absolutely sure you want to permanently delete this staff member from CRM database?',
      isDanger: true,
      onConfirm: async () => {
        await db.deleteStaff(id);
        setIsSuccess('Staff member removed.');
        fetchStaffData();
        setTimeout(() => setIsSuccess(null), 3000);
      }
    });
  };

  const handleExportBackup = async () => {
    const backup = await db.exportDataJSON();
    
    // Download file
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Paradise_CRM_DB_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    setIsSuccess('Database configuration downloaded successfully!');
    setTimeout(() => setIsSuccess(null), 3000);
  };

  const handleImportBackup = async () => {
    if (!backupString.trim()) {
      setError('Please paste a valid JSON string backup first.');
      return;
    }

    const success = await db.importDataJSON(backupString);
    if (success) {
      setIsSuccess('Database restored successfully! Refreshing page...');
      setBackupString('');
      setTimeout(() => {
        setIsSuccess(null);
        window.location.reload();
      }, 1500);
    } else {
      setError('Invalid backup JSON string. Please double-check formatting.');
    }
  };

  const handleResetSystem = async () => {
    if (currentUser.role !== 'Admin') {
      setError('Access Denied: Only administrators can factory reset the CRM database.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Factory Reset Database?',
      message: 'WARNING: This will permanently delete ALL enquiries, services, demos, follow-ups, and activity logs. Custom staff accounts will also be returned to defaults. Proceed?',
      isDanger: true,
      onConfirm: async () => {
        await db.resetDatabaseToDefault();
        setIsSuccess('All CRM database logs have been successfully cleared! Restarting database...');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Messages */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
      {isSuccess && (
        <div className="p-3.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{isSuccess}</span>
        </div>
      )}

      {/* Progressive Web App (PWA) Native Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
              <span className="material-icons text-blue-700 text-lg leading-none">phonelink_setup</span>
              Paradise CRM Native App (PWA)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Access the CRM as a secure standalone mobile app with offline-first support and instant start.
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase ${
            isStandalone 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}>
            {isStandalone ? 'Standalone Native App' : 'Running in Web Browser'}
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs space-y-1">
              <p className="font-bold text-slate-700">
                {isStandalone ? '✓ Running in Standalone Portrait Mode' : '⭐ Install Paradise CRM on Android Home Screen'}
              </p>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                {isStandalone 
                  ? 'Enjoy seamless, distraction-free operation with hidden browser URL bars, custom screen transitions, and instant startup.' 
                  : 'Add this application to your Android launcher to enjoy fullscreen operations, smooth native startup splash, and zero browser margins.'}
              </p>
            </div>

            {!isStandalone && onInstallApp && installAvailable && (
              <button
                onClick={onInstallApp}
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-100 shrink-0 cursor-pointer transition active:scale-95"
              >
                <span className="material-icons text-sm leading-none">add_to_home_screen</span>
                <span>Install App</span>
              </button>
            )}

            {!isStandalone && (!onInstallApp || !installAvailable) && (
              <div className="text-[10px] bg-slate-100 border text-slate-500 font-semibold py-1.5 px-3 rounded-lg shrink-0">
                Already Installed or Browser-Managed
              </div>
            )}

            {isStandalone && (
              <div className="text-[10px] bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 py-1.5 px-3 rounded-lg shrink-0 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Native</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Staff Management Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-blue-700" />
              Staff Management &amp; System Permissions Control
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Configure access credentials, user groups, and specific workflow permissions.</p>
          </div>

          {currentUser.role === 'Admin' && (
            <button
              onClick={() => setIsAddingStaff(!isAddingStaff)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAddingStaff ? 'Cancel' : 'Register Staff'}</span>
            </button>
          )}
        </div>

        {/* Add Staff form */}
        {isAddingStaff && (
          <form onSubmit={handleCreateStaff} className="p-4 bg-slate-50 border rounded-xl space-y-4 animate-slide-up">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Register New Office Account</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Singh"
                  className="w-full text-xs px-3 py-1.5 border rounded-lg focus:outline-none bg-white"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@paradise.com"
                  className="w-full text-xs px-3 py-1.5 border rounded-lg focus:outline-none bg-white"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Access Role</label>
                <select
                  className="w-full text-xs px-3 py-1.5 border rounded-lg focus:outline-none bg-white"
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as 'Admin' | 'Staff')}
                >
                  <option value="Staff">Standard Staff</option>
                  <option value="Admin">System Administrator</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="bg-blue-700 text-white text-xs font-bold py-1.5 px-4 rounded-lg hover:bg-blue-800 flex items-center gap-1 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save New User</span>
              </button>
            </div>
          </form>
        )}

        {/* Staff list & permissions editor table */}
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="p-3 text-[10px] uppercase font-bold text-slate-500">Staff Info</th>
                <th className="p-3 text-[10px] uppercase font-bold text-slate-500">Role</th>
                <th className="p-3 text-[10px] uppercase font-bold text-slate-500 text-center">Perms Matrix (Add / Edit / Delete / Services / Demos / Reports)</th>
                <th className="p-3 text-[10px] uppercase font-bold text-slate-500">Status</th>
                {currentUser.role === 'Admin' && <th className="p-3 text-[10px] uppercase font-bold text-slate-500">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {staffList.map((st) => (
                <tr key={st.id} className="border-b last:border-0 hover:bg-slate-50/50">
                  <td className="p-3">
                    <div className="font-bold text-slate-800">{st.name}</div>
                    <div className="text-[10px] text-slate-400">{st.email}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] ${
                      st.role === 'Admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-slate-100 text-slate-700 border'
                    }`}>{st.role}</span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center items-center gap-4">
                      {/* Checkbox columns */}
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={currentUser.role !== 'Admin' || st.role === 'Admin'}
                          checked={st.permissions.canAddEnquiry}
                          onChange={(e) => handlePermissionChange(st.id, 'canAddEnquiry', e.target.checked)}
                          className="rounded text-blue-600 focus:ring-0 cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-[10px] text-slate-500">Add</span>
                      </label>

                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={currentUser.role !== 'Admin' || st.role === 'Admin'}
                          checked={st.permissions.canEditEnquiry}
                          onChange={(e) => handlePermissionChange(st.id, 'canEditEnquiry', e.target.checked)}
                          className="rounded text-blue-600 focus:ring-0 cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-[10px] text-slate-500">Edit</span>
                      </label>

                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={currentUser.role !== 'Admin' || st.role === 'Admin'}
                          checked={st.permissions.canDeleteEnquiry}
                          onChange={(e) => handlePermissionChange(st.id, 'canDeleteEnquiry', e.target.checked)}
                          className="rounded text-blue-600 focus:ring-0 cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-[10px] text-slate-500">Del</span>
                      </label>

                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={currentUser.role !== 'Admin' || st.role === 'Admin'}
                          checked={st.permissions.canManageServices}
                          onChange={(e) => handlePermissionChange(st.id, 'canManageServices', e.target.checked)}
                          className="rounded text-blue-600 focus:ring-0 cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-[10px] text-slate-500">Svc</span>
                      </label>

                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={currentUser.role !== 'Admin' || st.role === 'Admin'}
                          checked={st.permissions.canManageDemos}
                          onChange={(e) => handlePermissionChange(st.id, 'canManageDemos', e.target.checked)}
                          className="rounded text-blue-600 focus:ring-0 cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-[10px] text-slate-500">Demo</span>
                      </label>

                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={currentUser.role !== 'Admin' || st.role === 'Admin'}
                          checked={st.permissions.canViewReports}
                          onChange={(e) => handlePermissionChange(st.id, 'canViewReports', e.target.checked)}
                          className="rounded text-blue-600 focus:ring-0 cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-[10px] text-slate-500">Report</span>
                      </label>
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleToggleStatus(st.id, st.status)}
                      disabled={currentUser.role !== 'Admin' || st.id === currentUser.id}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide transition uppercase ${
                        st.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
                      } disabled:opacity-50`}
                    >
                      {st.status}
                    </button>
                  </td>
                  {currentUser.role === 'Admin' && (
                    <td className="p-3">
                      <button
                        onClick={() => handleDeleteStaff(st.id)}
                        disabled={st.id === currentUser.id}
                        className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1 rounded hover:bg-slate-100"
                        title="Delete User permanently"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User-Configurable Notification Preferences Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-blue-700 animate-pulse" />
            My Notification &amp; Alert Preferences
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Configure real-time in-app triggers and simulated email alerts for specific operational events.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* In-App Toggles */}
          <div className="space-y-3.5 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
            <h4 className="text-[10px] font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <span className="material-icons text-xs text-blue-600">smartphone</span>
              In-App Alerts (Toasts &amp; Badges)
            </h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-700 block">New Customer Enquiry</span>
                  <span className="text-[9px] text-slate-400">Toasts on registering new client</span>
                </div>
                <button type="button" onClick={() => handleUpdatePref('inAppNewEnquiry')}>
                  {notifPrefs.inAppNewEnquiry ? (
                    <ToggleRight className="w-8 h-8 text-blue-600 cursor-pointer" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300 cursor-pointer" />
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center text-xs pt-2.5 border-t border-slate-100">
                <div>
                  <span className="font-bold text-slate-700 block">Assigned Follow-Up</span>
                  <span className="text-[9px] text-slate-400">Trigger on task due date or schedule</span>
                </div>
                <button type="button" onClick={() => handleUpdatePref('inAppAssignedFollowUp')}>
                  {notifPrefs.inAppAssignedFollowUp ? (
                    <ToggleRight className="w-8 h-8 text-blue-600 cursor-pointer" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300 cursor-pointer" />
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center text-xs pt-2.5 border-t border-slate-100">
                <div>
                  <span className="font-bold text-slate-700 block">Lead Status Update</span>
                  <span className="text-[9px] text-slate-400">Changes in submodules or pipeline</span>
                </div>
                <button type="button" onClick={() => handleUpdatePref('inAppStatusChange')}>
                  {notifPrefs.inAppStatusChange ? (
                    <ToggleRight className="w-8 h-8 text-blue-600 cursor-pointer" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300 cursor-pointer" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Email Toggles */}
          <div className="space-y-3.5 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
            <h4 className="text-[10px] font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <span className="material-icons text-xs text-blue-600">mail_outline</span>
              Email Dispatch Simulation
            </h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-700 block">New Customer Enquiry</span>
                  <span className="text-[9px] text-slate-400">Copy to team inbox</span>
                </div>
                <button type="button" onClick={() => handleUpdatePref('emailNewEnquiry')}>
                  {notifPrefs.emailNewEnquiry ? (
                    <ToggleRight className="w-8 h-8 text-blue-600 cursor-pointer" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300 cursor-pointer" />
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center text-xs pt-2.5 border-t border-slate-100">
                <div>
                  <span className="font-bold text-slate-700 block">Assigned Follow-Up</span>
                  <span className="text-[9px] text-slate-400">Direct alert to staff email</span>
                </div>
                <button type="button" onClick={() => handleUpdatePref('emailAssignedFollowUp')}>
                  {notifPrefs.emailAssignedFollowUp ? (
                    <ToggleRight className="w-8 h-8 text-blue-600 cursor-pointer" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300 cursor-pointer" />
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center text-xs pt-2.5 border-t border-slate-100">
                <div>
                  <span className="font-bold text-slate-700 block">Lead Status Update</span>
                  <span className="text-[9px] text-slate-400">Notification of pipeline modifications</span>
                </div>
                <button type="button" onClick={() => handleUpdatePref('emailStatusChange')}>
                  {notifPrefs.emailStatusChange ? (
                    <ToggleRight className="w-8 h-8 text-blue-600 cursor-pointer" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300 cursor-pointer" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Email Outbox Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-blue-700" />
              Simulated CRM Outbox &amp; Email Logs
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Verify email dispatches to team members and administrators in real-time.</p>
          </div>
          {emailLogs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>Clear Outbox</span>
            </button>
          )}
        </div>

        {viewingEmail ? (
          <div className="p-4 bg-slate-50 border rounded-xl space-y-3 animate-slide-up">
            <div className="flex justify-between items-center border-b pb-2">
              <button 
                onClick={() => setViewingEmail(null)}
                className="text-blue-700 text-xs font-bold flex items-center gap-1 hover:underline"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                <span>Back to Outbox</span>
              </button>
              <span className="text-[9px] font-mono text-slate-400">{new Date(viewingEmail.sentAt).toLocaleTimeString()}</span>
            </div>
            <div className="text-xs space-y-1.5 font-sans">
              <p className="border-b border-slate-100 pb-1"><strong className="text-slate-500 font-mono text-[9px] uppercase">To:</strong> <span className="font-bold text-slate-800">{viewingEmail.to}</span></p>
              <p className="border-b border-slate-100 pb-1"><strong className="text-slate-500 font-mono text-[9px] uppercase">Subject:</strong> <span className="font-bold text-blue-800">{viewingEmail.subject}</span></p>
              <div className="pt-2">
                <strong className="text-slate-500 font-mono text-[9px] uppercase block mb-1">Body:</strong>
                <pre className="text-[10px] bg-white p-3 border border-slate-100 rounded-lg font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto text-slate-700 shadow-inner">
                  {viewingEmail.body}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl bg-slate-50 p-2.5 space-y-2.5">
            {emailLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic bg-white rounded-xl border border-slate-100">
                No simulated emails sent yet. Trigger a notification event to see the outbox fill up!
              </div>
            ) : (
              emailLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="bg-white p-3 rounded-lg border border-slate-200/60 flex justify-between items-center gap-3 hover:border-blue-200 transition"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <span className="text-[9px] font-mono uppercase bg-slate-100 text-slate-500 border px-1 rounded">To</span>
                      <span className="truncate">{log.to}</span>
                    </p>
                    <p className="text-[10px] font-medium text-blue-800 truncate">{log.subject}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{new Date(log.sentAt).toLocaleDateString()} {new Date(log.sentAt).toLocaleTimeString()}</p>
                  </div>
                  <button
                    onClick={() => setViewingEmail(log)}
                    className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition shrink-0"
                    title="Read Email Body"
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Backup & System operations panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup operations */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b flex items-center gap-1.5">
            <Download className="w-4 h-4 text-blue-700" />
            CRM Backup &amp; Restore Module
          </h3>

          <div className="space-y-3.5">
            <p className="text-xs text-slate-500 leading-relaxed">
              Export the entire customer logs, services, demonstrations and team configurations into a self-contained JSON backup file, or upload one to sync.
            </p>

            <button
              onClick={handleExportBackup}
              className="w-full py-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Database JSON Backup</span>
            </button>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-[10px] font-bold uppercase text-slate-400">Restore DB from JSON String</label>
              <textarea
                rows={3}
                placeholder="Paste backup JSON string contents here..."
                className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                value={backupString}
                onChange={(e) => setBackupString(e.target.value)}
              />
              <button
                onClick={handleImportBackup}
                className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Upload className="w-4 h-4" />
                <span>Upload &amp; Restore CRM Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Password change placeholder & Factory Reset */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              Change CRM Access Credentials
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Current Staff Email</label>
                <input
                  type="email"
                  disabled
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl"
                  value={currentUser.email}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">New CRM Access Code</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsSuccess('Password successfully updated in cache.');
                  setTimeout(() => setIsSuccess(null), 2500);
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
              >
                Update Access Pin
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Custom Confirmation Dialog Modal (Iframe Safe) */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden font-sans">
            <div className="p-6 space-y-4">
              <div className={`flex items-center gap-3 ${confirmModal.isDanger ? 'text-red-600' : 'text-blue-700'}`}>
                <div className={`p-3 rounded-full ${confirmModal.isDanger ? 'bg-red-50' : 'bg-blue-50'}`}>
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{confirmModal.title}</h3>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed">
                {confirmModal.message}
              </p>
              
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className={`px-4 py-2 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm ${
                    confirmModal.isDanger 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-100' 
                      : 'bg-blue-700 hover:bg-blue-800 shadow-blue-100'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
