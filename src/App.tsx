import React, { useState, useEffect } from 'react';
import { 
  Enquiry, ServiceLog, DemoLog, FollowUpLog, Staff, ActivityLog, 
  EnquiryStatus, EnquiryType, EnquirySource, ServiceStatus, DemoStatus, FollowUpStatus,
  DemoInstallation, InstallationStatus, Category
} from './types';
import { db } from './lib/database';

// Import newly created modular components
import LoginView from './components/LoginView';
import EnquiryForm from './components/EnquiryForm';
import CustomerProfile from './components/CustomerProfile';
import DashboardView from './components/DashboardView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import QuickActionDrawer from './components/QuickActionDrawer';
import DemoInstallationView from './components/DemoInstallationView';
import { AnimatePresence, motion } from 'motion/react';
import paradiseLogo from './assets/images/paradise_logo_1782977877440.jpg';

// Lucide icon imports
import { 
  ClipboardList, Construction, Presentation, Calendar, 
  BarChart3, Settings as SettingsIcon, LogOut, Search, Filter, 
  Plus, Edit2, Trash2, User, Phone, MessageSquare, Check, X,
  ChevronsUpDown, AlertCircle, Menu, Eye, PlusCircle, Bell, Mail, Sparkles,
  Mic, MicOff
} from 'lucide-react';

// Import Notification library & component
import { 
  getNotifications, 
  notifyEvent, 
  markNotificationAsRead, 
  markAllAsRead, 
  clearAllNotifications, 
  CRMNotification 
} from './lib/notifications';
import NotificationCenter from './components/NotificationCenter';

export default function App() {
  // Session State
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);

  // Active Screen Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'enquiry' | 'service' | 'demo' | 'followup' | 'reports' | 'settings' | 'installation'>('dashboard');

  // Shared Datastore State
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [services, setServices] = useState<ServiceLog[]>([]);
  const [demos, setDemos] = useState<DemoLog[]>([]);
  const [followups, setFollowups] = useState<FollowUpLog[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [installations, setInstallations] = useState<DemoInstallation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  // Notification System State
  const [notifications, setNotifications] = useState<CRMNotification[]>([]);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  // Syncing Visual Feedback State
  const [isSyncing, setIsSyncing] = useState(false);

  // Connection / Sync Status
  const [connectionStatus, setConnectionStatus] = useState({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0
  });

  useEffect(() => {
    const unsub = db.subscribeToConnectionStatus((status) => {
      setConnectionStatus(status);
    });
    return unsub;
  }, []);

  // Navigation Filter presets from Dashboard clicks
  const [dashFilterField, setDashFilterField] = useState<string | null>(null);

  // Profile Drawer State
  const [selectedEnquiryForProfile, setSelectedEnquiryForProfile] = useState<Enquiry | null>(null);

  // Enquiry Form State
  const [isEnquiryFormOpen, setIsEnquiryFormOpen] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState<Enquiry | undefined>(undefined);

  // Search & Filter state for Customer Enquiry Module
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showRecycleBin, setShowRecycleBin] = useState<boolean>(false);
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Service Module Form State
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [newServiceEnquiryId, setNewServiceEnquiryId] = useState('');
  const [newServiceCustomerName, setNewServiceCustomerName] = useState('');
  const [newServiceCustomerMobile, setNewServiceCustomerMobile] = useState('');
  const [newServiceProduct, setNewServiceProduct] = useState('');
  const [newServiceIssue, setNewServiceIssue] = useState('');
  const [newServiceTech, setNewServiceTech] = useState('');
  const [newServiceCharges, setNewServiceCharges] = useState(0);
  const [newServiceImageName, setNewServiceImageName] = useState('');
  const [newServiceImageData, setNewServiceImageData] = useState('');
  const [newServicePdfName, setNewServicePdfName] = useState('');
  const [newServicePdfData, setNewServicePdfData] = useState('');
  const [isServiceTruecallerOpen, setIsServiceTruecallerOpen] = useState(false);
  const [serviceTruecallerInput, setServiceTruecallerInput] = useState('');
  const [serviceTruecallerFeedback, setServiceTruecallerFeedback] = useState<string | null>(null);

  // Demo Module Form State
  const [isDemoFormOpen, setIsDemoFormOpen] = useState(false);
  const [newDemoEnquiryId, setNewDemoEnquiryId] = useState('');
  const [newDemoDate, setNewDemoDate] = useState('');
  const [newDemoDemonstrator, setNewDemoDemonstrator] = useState('');
  const [newDemoFeedback, setNewDemoFeedback] = useState('');

  // Follow-up modal outcome State
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpLog | null>(null);
  const [followUpOutcome, setFollowUpOutcome] = useState('');

  // Quick Action Drawer State
  const [quickActionDrawer, setQuickActionDrawer] = useState<{
    isOpen: boolean;
    enquiry: Enquiry;
    type: 'Call' | 'WhatsApp';
  } | null>(null);

  // Toast System
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Web Speech API Voice Search State & Handler
  const [isListening, setIsListening] = useState<boolean>(false);

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      triggerToast('Speech recognition is not supported in this browser.', 'error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      triggerToast('Listening for customer name or mobile number...', 'info');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event);
      setIsListening(false);
      triggerToast(`Voice recognition failed: ${event.error}`, 'error');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      let cleanedText = transcript.trim();
      // If it contains only digits and spaces, remove spaces
      if (/^[\d\s+-]+$/.test(cleanedText)) {
        cleanedText = cleanedText.replace(/\s+/g, '');
      }
      setSearchQuery(cleanedText);
      triggerToast(`Searching for: "${cleanedText}"`, 'success');
    };

    recognition.start();
  };

  // Mobile Sidebar State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // PWA & Android-Native State Management
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showSplash, setShowSplash] = useState<boolean>(false);

  // Detect standalone mode & listen to install prompt
  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true ||
                         document.referrer.includes('android-app://');
      setIsStandalone(standalone);
    };

    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const listener = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('[PWA] beforeinstallprompt event fired and captured.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Auto fade-out splash screen after 1.8 seconds for smooth native app startup
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1800);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', listener);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      triggerToast('PWA Installation already completed or not supported on this browser.', 'info');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      triggerToast('Thank you for installing Paradise CRM!', 'success');
    }
  };

  // Initialize and load session
  useEffect(() => {
    let sessionStr = sessionStorage.getItem('crm_active_session');
    if (!sessionStr) {
      sessionStr = localStorage.getItem('crm_active_session');
    }
    
    // Legacy fallback
    if (!sessionStr) {
      const legacyUser = localStorage.getItem('crm_active_user');
      if (legacyUser) {
        try {
          const u = JSON.parse(legacyUser);
          setCurrentUser(u);
          // Migrate to session storage
          const sessionData = {
            user: u,
            remember: false,
            loginTime: Date.now(),
            lastActive: Date.now()
          };
          sessionStorage.setItem('crm_active_session', JSON.stringify(sessionData));
        } catch (e) {
          localStorage.removeItem('crm_active_user');
        }
        return;
      }
    }

    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        const now = Date.now();
        // Remembered sessions expire in 30 days, unremembered session expires in 2 hours of inactivity/absolute
        const maxAge = session.remember ? 30 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
        
        if (now - session.loginTime > maxAge) {
          localStorage.removeItem('crm_active_session');
          sessionStorage.removeItem('crm_active_session');
          triggerToast('Your security session has expired. Please log in again.', 'info');
        } else {
          // Verify active status with DB
          db.getStaff().then(staffList => {
            const fresh = staffList.find(s => s.id === session.user.id);
            if (fresh && fresh.status === 'Inactive') {
              localStorage.removeItem('crm_active_session');
              sessionStorage.removeItem('crm_active_session');
              triggerToast('Your account has been suspended. Please contact Admin.', 'error');
              setCurrentUser(null);
            } else {
              setCurrentUser(session.user);
              session.lastActive = now;
              if (session.remember) {
                localStorage.setItem('crm_active_session', JSON.stringify(session));
              } else {
                sessionStorage.setItem('crm_active_session', JSON.stringify(session));
              }
            }
          }).catch(() => {
            setCurrentUser(session.user);
          });
        }
      } catch (e) {
        localStorage.removeItem('crm_active_session');
        sessionStorage.removeItem('crm_active_session');
      }
    }
  }, []);

  // Real-time synchronization using Firebase Realtime Database subscription listeners
  useEffect(() => {
    if (!currentUser) return;

    setIsSyncing(true);
    let isInitialLoading = true;

    // Register Realtime Database listeners for all collections
    const unsubscribes: (() => void)[] = [
      db.subscribeToEnquiries((data) => {
        setEnquiries(data);
        if (isInitialLoading) checkLoadingState();
      }),
      db.subscribeToServices((data) => {
        setServices(data);
        if (isInitialLoading) checkLoadingState();
      }),
      db.subscribeToDemos((data) => {
        setDemos(data);
        if (isInitialLoading) checkLoadingState();
      }),
      db.subscribeToFollowUps((data) => {
        setFollowups(data);
        if (isInitialLoading) checkLoadingState();
      }),
      db.subscribeToInstallations((data) => {
        setInstallations(data);
        if (isInitialLoading) checkLoadingState();
      }),
      db.subscribeToActivities((data) => {
        setActivities(data);
        if (isInitialLoading) checkLoadingState();
      }),
      db.subscribeToCategories((data) => {
        setCategories(data);
        if (isInitialLoading) checkLoadingState();
      }),
      db.subscribeToStaff((data) => {
        if (isInitialLoading) checkLoadingState();
        
        // Real-time Suspended Staff Blocking & Permissions sync
        if (currentUser) {
          const freshMe = data.find(s => s.id === currentUser.id);
          if (freshMe) {
            if (freshMe.status === 'Inactive') {
              handleLogout();
              triggerToast('Your account is currently suspended. Access has been revoked.', 'error');
            } else if (JSON.stringify(freshMe.permissions) !== JSON.stringify(currentUser.permissions)) {
              const updatedMe = { ...currentUser, permissions: freshMe.permissions };
              setCurrentUser(updatedMe);
              const isRem = localStorage.getItem('crm_active_session') !== null;
              const sKey = isRem ? 'localStorage' : 'sessionStorage';
              const sessionStr = isRem 
                ? localStorage.getItem('crm_active_session') 
                : sessionStorage.getItem('crm_active_session');
              if (sessionStr) {
                try {
                  const sObj = JSON.parse(sessionStr);
                  sObj.user = updatedMe;
                  if (isRem) {
                    localStorage.setItem('crm_active_session', JSON.stringify(sObj));
                  } else {
                    sessionStorage.setItem('crm_active_session', JSON.stringify(sObj));
                  }
                } catch (e) {}
              }
              triggerToast('Your security permissions have been updated.', 'info');
            }
          }
        }
      })
    ];

    function checkLoadingState() {
      isInitialLoading = false;
      setIsSyncing(false);
    }

    // Fallback loading indicator timeout
    const fallbackTimer = setTimeout(() => {
      setIsSyncing(false);
    }, 1500);

    return () => {
      unsubscribes.forEach((unsub) => {
        try { unsub(); } catch (e) { console.error(e); }
      });
      clearTimeout(fallbackTimer);
    };
  }, [currentUser]);

  const loadAllStores = async () => {
    setIsSyncing(true);
    try {
      const enqs = await db.getEnquiries(true);
      setEnquiries(enqs);

      const srvs = await db.getServices();
      setServices(srvs);

      const dms = await db.getDemos();
      setDemos(dms);

      const fups = await db.getFollowUps();
      setFollowups(fups);

      const acts = await db.getActivities();
      setActivities(acts);

      const insts = await db.getInstallations();
      setInstallations(insts);

      const cats = await db.getCategories();
      setCategories(cats);
    } catch (e) {
      console.error('Error manual-refreshing database:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const refreshNotifications = () => {
    if (currentUser) {
      setNotifications(getNotifications(currentUser.email));
    } else {
      setNotifications([]);
    }
  };

  useEffect(() => {
    refreshNotifications();
  }, [currentUser]);

  const triggerNotificationEvent = async (
    type: 'new_enquiry' | 'assigned_followup' | 'status_change',
    title: string,
    message: string,
    enquiryId?: string,
    assignedToEmail?: string
  ) => {
    try {
      const staffList = await db.getStaff();
      const targetEmails = new Set<string>();

      // 1. All Active Admins
      staffList.forEach(s => {
        if (s.role === 'Admin' && s.status === 'Active') {
          targetEmails.add(s.email);
        }
      });

      // 2. Assigned staff member (if specified and active)
      if (assignedToEmail) {
        const staff = staffList.find(s => s.email.toLowerCase() === assignedToEmail.toLowerCase() && s.status === 'Active');
        if (staff) {
          targetEmails.add(staff.email);
        }
      }

      // Send to current user as well, so they can test/see their own updates
      if (currentUser) {
        targetEmails.add(currentUser.email);
      }

      // Dispatch event
      notifyEvent({
        type,
        title,
        message,
        enquiryId,
        targetEmails: Array.from(targetEmails)
      });

      // Refresh state
      refreshNotifications();
    } catch (e) {
      console.error('Error dispatching notification:', e);
    }
  };

  const handleMarkNotifRead = (id: string) => {
    markNotificationAsRead(id);
    refreshNotifications();
  };

  const handleMarkAllNotifsRead = () => {
    if (currentUser) {
      markAllAsRead(currentUser.email);
      refreshNotifications();
      triggerToast('All alerts marked as read', 'success');
    }
  };

  const handleClearAllNotifs = () => {
    if (currentUser) {
      clearAllNotifications(currentUser.email);
      refreshNotifications();
      triggerToast('Notifications cleared', 'info');
    }
  };

  const handleNotifActionClick = (notif: CRMNotification) => {
    setIsNotificationPanelOpen(false);
    
    if (notif.enquiryId) {
      // Find the associated enquiry
      const enq = enquiries.find(e => e.id === notif.enquiryId);
      if (enq) {
        // Open Customer Profile Drawer
        setSelectedEnquiryForProfile(enq);
      }
    }
    
    // Redirect user to the correct tab based on category
    if (notif.category === 'enquiry') {
      setActiveTab('enquiry');
    } else if (notif.category === 'followup') {
      setActiveTab('followup');
    } else if (notif.category === 'status_change') {
      const msg = notif.message.toLowerCase();
      const titleLower = notif.title.toLowerCase();
      if (titleLower.includes('service') || msg.includes('service') || msg.includes('repair')) {
        setActiveTab('service');
      } else if (titleLower.includes('demo')) {
        setActiveTab('demo');
      } else {
        setActiveTab('enquiry');
      }
    }
  };

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async (user: Staff, remember: boolean = false) => {
    setCurrentUser(user);
    const sessionData = {
      user,
      remember,
      loginTime: Date.now(),
      lastActive: Date.now()
    };

    if (remember) {
      localStorage.setItem('crm_active_session', JSON.stringify(sessionData));
    } else {
      sessionStorage.setItem('crm_active_session', JSON.stringify(sessionData));
    }
    // Clear legacy keys if present
    localStorage.removeItem('crm_active_user');

    await loadAllStores();
    triggerToast(`Authenticated successfully as ${user.name}!`, 'success');
    db.logActivity('system', 'User Login Successful', `Staff session initiated for ${user.email} (Remember Me: ${remember ? 'YES' : 'NO'})`, user.name);
  };

  const handleLogout = () => {
    if (currentUser) {
      db.logActivity('system', 'User Logout', `Staff session closed for ${currentUser.email}`, currentUser.name);
    }
    setCurrentUser(null);
    localStorage.removeItem('crm_active_session');
    sessionStorage.removeItem('crm_active_session');
    localStorage.removeItem('crm_active_user');
    triggerToast('Logged out of CRM database.', 'info');
  };

  const handleResetAllData = async () => {
    if (currentUser?.role !== 'Admin') {
      triggerToast('Access Denied: Only administrators can factory reset the database.', 'error');
      return;
    }
    if (window.confirm('WARNING: This will permanently delete ALL enquiries, services, demos, follow-ups, and activity logs. Custom staff accounts will also be returned to defaults. Proceed?')) {
      try {
        await db.resetDatabaseToDefault();
        triggerToast('All CRM database logs have been successfully cleared!', 'success');
      } catch (e) {
        triggerToast('Failed to clear CRM database.', 'error');
      }
    }
  };

  // 1. CRM Customer Enquiry operations
  const handleSaveEnquiry = async (enquiryData: Omit<Enquiry, 'id' | 'createdAt'>) => {
    try {
      if (editingEnquiry) {
        // Edit Mode
        if (currentUser && !currentUser.permissions.canEditEnquiry && currentUser.role !== 'Admin') {
          triggerToast('Access Denied: You do not have permissions to edit enquiries.', 'error');
          return;
        }

        const original = enquiries.find(e => e.id === editingEnquiry.id);
        await db.updateEnquiry(editingEnquiry.id, enquiryData, currentUser?.email || 'System');
        triggerToast('Enquiry updated successfully!');

        // Trigger Notifications on important updates
        if (original) {
          let notificationDispatched = false;
          if (original.status !== enquiryData.status) {
            notificationDispatched = true;
            await triggerNotificationEvent(
              'status_change',
              'Customer Lead Status Updated',
              `Customer ${enquiryData.customerName}'s pipeline level has transitioned from "${original.status}" to "${enquiryData.status}" (Updated by: ${currentUser?.name || 'Staff'}).`,
              editingEnquiry.id,
              enquiryData.assignedTo
            );
          }
          if (original.assignedTo?.toLowerCase() !== enquiryData.assignedTo?.toLowerCase() && enquiryData.assignedTo) {
            notificationDispatched = true;
            await triggerNotificationEvent(
              'assigned_followup',
              'Customer Enquiry Assigned to You',
              `The customer enquiry for ${enquiryData.customerName} has been assigned to you by ${currentUser?.name || 'Staff'}.`,
              editingEnquiry.id,
              enquiryData.assignedTo
            );
          }
          if (!notificationDispatched) {
            await triggerNotificationEvent(
              'status_change',
              'Customer Enquiry Details Modified',
              `The enquiry details for customer ${enquiryData.customerName} have been modified by ${currentUser?.name || 'Staff'}.`,
              editingEnquiry.id,
              enquiryData.assignedTo
            );
          }
        }
      } else {
        // Add Mode
        if (currentUser && !currentUser.permissions.canAddEnquiry && currentUser.role !== 'Admin') {
          triggerToast('Access Denied: You do not have permissions to add enquiries.', 'error');
          return;
        }

        const newEnq = await db.addEnquiry(enquiryData);
        triggerToast('Successfully registered new customer enquiry!');

        // Dispatch general new lead alert
        await triggerNotificationEvent(
          'new_enquiry',
          'New Client Enquiry Registered',
          `Customer ${enquiryData.customerName} has been registered for product: ${enquiryData.product} (${enquiryData.brand}) by ${currentUser?.name || 'Staff'}.`,
          newEnq.id,
          enquiryData.assignedTo
        );

        // If follow-up date was set, also notify about scheduled follow-up
        if (enquiryData.followUpDate) {
          await triggerNotificationEvent(
            'assigned_followup',
            'Pending Customer Follow-Up Scheduled',
            `A follow-up task has been automatically scheduled on ${new Date(enquiryData.followUpDate).toLocaleDateString('en-IN')} for customer ${enquiryData.customerName}.`,
            newEnq.id,
            enquiryData.assignedTo
          );
        }
      }

      // Cleanup
      setIsEnquiryFormOpen(false);
      setEditingEnquiry(undefined);
    } catch (e) {
      triggerToast('An error occurred. Check parameters and retry.', 'error');
    }
  };

  const [enquiryToDelete, setEnquiryToDelete] = useState<string | null>(null);

  const handleDeleteEnquiry = async (id: string) => {
    if (currentUser && currentUser.role !== 'Admin' && !currentUser.permissions?.canDeleteEnquiry) {
      triggerToast('Access Denied: You do not have permission to delete customer enquiries.', 'error');
      return;
    }

    setEnquiryToDelete(id);
  };

  const confirmDeleteEnquiry = async () => {
    if (!enquiryToDelete) return;
    const id = enquiryToDelete;
    const targetEnq = enquiries.find(e => e.id === id);
    setEnquiryToDelete(null);
    try {
      await db.deleteEnquiry(id, currentUser?.email || 'System');
      triggerToast('Customer enquiry moved to Recycle Bin.', 'success');
      if (targetEnq) {
        await triggerNotificationEvent(
          'status_change',
          'Customer Enquiry Deleted',
          `The enquiry for customer ${targetEnq.customerName} has been soft-deleted and moved to the Recycle Bin by ${currentUser?.name || 'Staff'}.`,
          id,
          targetEnq.assignedTo
        );
      }
    } catch (e) {
      triggerToast('Failed to move enquiry to Recycle Bin.', 'error');
    }
  };

  const [enquiryToPurge, setEnquiryToPurge] = useState<string | null>(null);

  const handlePermanentlyDeleteEnquiry = (id: string) => {
    if (currentUser && currentUser.role !== 'Admin') {
      triggerToast('Access Denied: Only administrators can permanently purge data.', 'error');
      return;
    }
    setEnquiryToPurge(id);
  };

  const handleRestoreEnquiry = async (id: string) => {
    try {
      await db.restoreEnquiry(id, currentUser?.email || 'System');
      triggerToast('Customer enquiry restored successfully.', 'success');
      const allEnqs = await db.getEnquiries(true);
      const restoredEnq = allEnqs.find(e => e.id === id);
      if (restoredEnq) {
        await triggerNotificationEvent(
          'status_change',
          'Customer Enquiry Restored',
          `The enquiry for customer ${restoredEnq.customerName} has been restored from the Recycle Bin by ${currentUser?.name || 'Staff'}.`,
          id,
          restoredEnq.assignedTo
        );
      }
    } catch (e) {
      triggerToast('Failed to restore customer enquiry.', 'error');
    }
  };

  const confirmPurgeEnquiry = async () => {
    if (!enquiryToPurge) return;
    const id = enquiryToPurge;
    setEnquiryToPurge(null);
    try {
      const allEnqs = await db.getEnquiries(true);
      const targetEnq = allEnqs.find(e => e.id === id);
      await db.permanentlyDeleteEnquiry(id, currentUser?.email || 'System');
      triggerToast('Customer enquiry permanently purged.', 'success');
      if (targetEnq) {
        await triggerNotificationEvent(
          'status_change',
          'Customer Enquiry Purged',
          `The enquiry for customer ${targetEnq.customerName} and all associated records have been permanently deleted from the database by ${currentUser?.name || 'Staff'}.`,
          undefined,
          targetEnq.assignedTo
        );
      }
    } catch (e) {
      triggerToast('Failed to permanently purge enquiry.', 'error');
    }
  };

  const handleDeleteService = (id: string) => {
    if (currentUser && currentUser.role !== 'Admin' && !currentUser.permissions?.canManageServices) {
      triggerToast('Access Denied: You do not have permission to delete service tickets.', 'error');
      return;
    }
    setServiceToDelete(id);
  };

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;
    const id = serviceToDelete;
    const targetSrv = services.find(s => s.id === id);
    setServiceToDelete(null);
    try {
      await db.deleteService(id, currentUser?.email || 'System');
      triggerToast('Service ticket deleted successfully.', 'success');
      if (targetSrv) {
        await triggerNotificationEvent(
          'status_change',
          'Service Repair Ticket Deleted',
          `The service repair ticket for customer ${targetSrv.customerName} (Product: ${targetSrv.product}) has been deleted by ${currentUser?.name || 'Staff'}.`,
          targetSrv.enquiryId.startsWith('custom-') ? undefined : targetSrv.enquiryId,
          currentUser?.email
        );
      }
    } catch (e) {
      triggerToast('Failed to delete service ticket.', 'error');
    }
  };

  // Truecaller paste handler for Services
  const handleServiceTruecallerParse = () => {
    if (!serviceTruecallerInput.trim()) {
      setServiceTruecallerFeedback('Please paste some text or links first.');
      return;
    }

    // Pre-sanitize input to remove any WhatsApp chat log headers like:
    // [28/06, 11:45 am] Anjali Papa:
    // or standard format 28/06/23, 11:45 am - Anjali Papa:
    const bracketRegex = /\[\d{1,2}[\/\.-]\d{1,2}(?:[\/\.-]\d{2,4})?,?\s+\d{1,2}:\d{2}(?::\d{2})?(?:[\s\u202f\xa0]?[a-zA-Z]+)?\]\s*([^:\n]+):\s*/gi;
    const dashRegex = /\b\d{1,2}[\/\.-]\d{1,2}(?:[\/\.-]\d{2,4})?,?\s+\d{1,2}:\d{2}(?::\d{2})?(?:[\s\u202f\xa0]?[a-zA-Z]+)?\s*-\s*([^:\n]+):\s*/gi;
    const specificRegex = /\[28\/06,?\s+11:45[\s\u202f\xa0]?am\]\s*Anjali\s+Papa:\s*/gi;
    const nameColonRegex = /^(Anjali\s+Papa:?|Anjali\s+Papa\s+:\s*)/gi;

    let sanitizedInput = serviceTruecallerInput
      .replace(bracketRegex, '')
      .replace(dashRegex, '')
      .replace(specificRegex, '')
      .replace(nameColonRegex, '');

    const lines = sanitizedInput
      .split('\n')
      .map(l => {
        let cleanedLine = l.trim();
        // Scrub residual occurrences inside the lines as well
        cleanedLine = cleanedLine
          .replace(/\[\d{1,2}[\/\.-]\d{1,2}.*?\]\s*Anjali\s+Papa:\s*/gi, '')
          .replace(/Anjali\s+Papa:\s*/gi, '')
          .trim();
        return cleanedLine;
      })
      .filter(l => l.length > 0);
    
    let parsedName = '';
    let parsedPhone = '';
    let parsedProduct = '';

    const PRODUCT_CATEGORIES = [
      "AC", "Air Fryer", "Almirah", "Battery", "Blower", "Book Cabinet", "CCTV", "Chair", "Chimney", "Clock", "Cooker", "Cooktop", "Cooler", "Deep Freezer", "Desktop", "Dining Table", "Fan", "Fridge", "Geyser", "Heater", "Home Theater", "Induction", "Inverter", "Iron", "JMG", "Juicer", "Kettle", "Laptop", "LED", "Mattress", "Microwave", "Mixer Grinder", "Mobile", "Oil Filled Heater", "Other", "Pillow", "Printer", "RO System", "Sandwich Maker", "Shoe Cabinet", "Stabilizer", "Stool", "Tea Table", "Toaster", "Trolley", "Vacuum Cleaner", "Visi Cooler", "Washing Machine", "Water Purifier", "Wrist Watch"
    ];

    // 1. Detect Category match in text
    const textLower = sanitizedInput.toLowerCase();
    const sortedCategories = [...PRODUCT_CATEGORIES].sort((a, b) => b.length - a.length);
    for (const cat of sortedCategories) {
      const regex = new RegExp(`\\b${cat.toLowerCase()}\\b`, 'i');
      if (regex.test(textLower)) {
        parsedProduct = cat;
        break;
      }
    }

    // 2. Parse line by line
    for (const line of lines) {
      const isUrl = line.startsWith('http://') || line.startsWith('https://');
      const digitsOnly = line.replace(/\D/g, '');
      const isPhone = (line.startsWith('+') && digitsOnly.length >= 10) || (digitsOnly.length >= 10 && !isUrl);

      if (isUrl) {
        const urlMatch = line.match(/\/(\d{10,12})$/);
        if (urlMatch) {
          let num = urlMatch[1];
          if (num.startsWith('91') && num.length > 10) {
            num = num.substring(2);
          }
          parsedPhone = num;
        }
      } else if (isPhone) {
        let num = digitsOnly;
        if (num.startsWith('91') && num.length > 10) {
          num = num.substring(2);
        }
        if (num.length === 10) {
          parsedPhone = num;
        } else {
          parsedPhone = num.slice(-10);
        }
      } else {
        if (!parsedName) {
          parsedName = line;
        } else if (!parsedProduct) {
          parsedProduct = line;
        }
      }
    }

    if (parsedName) {
      const lowerName = parsedName.toLowerCase().trim();
      if (lowerName !== 'anjali papa' && !lowerName.includes('anjali papa')) {
        setNewServiceCustomerName(parsedName);
      }
    }
    if (parsedPhone) setNewServiceCustomerMobile(parsedPhone);
    if (parsedProduct) setNewServiceProduct(parsedProduct);

    setServiceTruecallerFeedback('Successfully parsed and populated details!');
    setTimeout(() => {
      setIsServiceTruecallerOpen(false);
      setServiceTruecallerInput('');
      setServiceTruecallerFeedback(null);
    }, 1200);
  };

  // 2. CRM Service Job operations
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalEnquiryId = newServiceEnquiryId;
    let finalCustomerName = newServiceCustomerName.trim();
    let finalCustomerMobile = newServiceCustomerMobile.trim();
    let finalProduct = newServiceProduct.trim();

    if (newServiceEnquiryId && newServiceEnquiryId !== 'custom') {
      const linkedEnq = enquiries.find(eq => eq.id === newServiceEnquiryId);
      if (linkedEnq) {
        finalCustomerName = linkedEnq.customerName;
        finalCustomerMobile = linkedEnq.mobile;
        finalProduct = `${linkedEnq.brand} ${linkedEnq.product}`;
      }
    } else {
      if (!finalCustomerName || !finalCustomerMobile) {
        triggerToast('Please provide customer name and mobile number.', 'error');
        return;
      }
      finalEnquiryId = `custom-${Date.now()}`;
    }

    try {
      await db.addService({
        enquiryId: finalEnquiryId,
        customerName: finalCustomerName,
        customerMobile: finalCustomerMobile || undefined,
        product: finalProduct,
        issue: newServiceIssue.trim(),
        technicianName: newServiceTech.trim() || undefined,
        charges: newServiceCharges || undefined,
        status: 'Pending',
        imageName: newServiceImageName || undefined,
        imageData: newServiceImageData || undefined,
        pdfName: newServicePdfName || undefined,
        pdfData: newServicePdfData || undefined
      }, currentUser?.email || 'System');

      setIsServiceFormOpen(false);
      setNewServiceEnquiryId('');
      setNewServiceCustomerName('');
      setNewServiceCustomerMobile('');
      setNewServiceProduct('');
      setNewServiceIssue('');
      setNewServiceTech('');
      setNewServiceCharges(0);
      setNewServiceImageName('');
      setNewServiceImageData('');
      setNewServicePdfName('');
      setNewServicePdfData('');
      triggerToast('Logged new service center ticket!');

      // Trigger notification
      await triggerNotificationEvent(
        'status_change',
        'New Service Repair Ticket Logged',
        `A repair service ticket has been registered for customer ${finalCustomerName} (Product: ${finalProduct}). Problem: "${newServiceIssue.trim()}".`,
        finalEnquiryId.startsWith('custom-') ? undefined : finalEnquiryId,
        currentUser?.email
      );
    } catch (e) {
      triggerToast('Could not register service job.', 'error');
    }
  };

  const handleUpdateServiceStatus = async (id: string, status: ServiceStatus) => {
    try {
      await db.updateService(id, { status }, currentUser?.email || 'System');
      triggerToast(`Service job status set to ${status}.`);

      // Trigger notification
      const srv = services.find(s => s.id === id);
      if (srv) {
        await triggerNotificationEvent(
          'status_change',
          'Repair Service Status Updated',
          `Service repair job status for customer ${srv.customerName} set to "${status}" (Updated by: ${currentUser?.name || 'Staff'}).`,
          srv.enquiryId,
          currentUser?.email
        );
      }
    } catch (e) {
      triggerToast('Failed updating service log.', 'error');
    }
  };

  // 3. CRM Product Demonstration operations
  const handleCreateDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDemoEnquiryId || !newDemoDate) {
      triggerToast('Please select a customer and choose a scheduled date.', 'error');
      return;
    }

    const linkedEnq = enquiries.find(eq => eq.id === newDemoEnquiryId);
    if (!linkedEnq) return;

    try {
      await db.addDemo({
        enquiryId: newDemoEnquiryId,
        customerName: linkedEnq.customerName,
        product: linkedEnq.product,
        brand: linkedEnq.brand,
        model: linkedEnq.model,
        scheduledDate: newDemoDate,
        demonstratorName: newDemoDemonstrator.trim() || undefined,
        status: 'Scheduled',
        feedback: newDemoFeedback.trim() || undefined
      }, currentUser?.email || 'System');

      setIsDemoFormOpen(false);
      setNewDemoEnquiryId('');
      setNewDemoDate('');
      setNewDemoDemonstrator('');
      setNewDemoFeedback('');
      triggerToast('Scheduled new product demonstration!');

      // Trigger notification
      await triggerNotificationEvent(
        'assigned_followup',
        'Product Demonstration Scheduled',
        `A product demonstration has been scheduled for customer ${linkedEnq.customerName} on ${new Date(newDemoDate).toLocaleDateString('en-IN')}. Demonstrator: ${newDemoDemonstrator.trim() || 'TBD'}.`,
        newDemoEnquiryId,
        linkedEnq.assignedTo
      );
    } catch (e) {
      triggerToast('Failed to schedule demo.', 'error');
    }
  };

  const handleUpdateDemoStatus = async (id: string, status: DemoStatus) => {
    try {
      await db.updateDemo(id, { status }, currentUser?.email || 'System');
      triggerToast(`Demo status updated to ${status}.`);

      // Trigger notification
      const dm = demos.find(d => d.id === id);
      if (dm) {
        await triggerNotificationEvent(
          'status_change',
          'Demonstration Event Log Updated',
          `The scheduled product demonstration for customer ${dm.customerName} has been updated to status: "${status}".`,
          dm.enquiryId,
          currentUser?.email
        );
      }
    } catch (e) {
      triggerToast('Failed to update demo log.', 'error');
    }
  };

  // 4. CRM Follow-up Complete Action
  const handleCompleteFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp) return;

    try {
      await db.updateFollowUp(selectedFollowUp.id, {
        status: 'Completed',
        outcome: followUpOutcome.trim() || 'Follow-up Call Completed'
      }, currentUser?.email || 'System');

      setIsFollowUpModalOpen(false);
      setSelectedFollowUp(null);
      setFollowUpOutcome('');
      triggerToast('Logged follow-up call outcomes safely!');

      // Trigger notification
      await triggerNotificationEvent(
        'status_change',
        'Customer Follow-Up Call Completed',
        `Follow-up call with customer ${selectedFollowUp.customerName} has been logged as completed by ${currentUser?.name || 'Staff'}. Outcome: "${followUpOutcome.trim() || 'Completed'}"`,
        selectedFollowUp.enquiryId,
        currentUser?.email
      );
    } catch (e) {
      triggerToast('Could not save follow-up details.', 'error');
    }
  };

  const handleDeleteFollowUp = async (id: string) => {
    if (currentUser && currentUser.role !== 'Admin' && !currentUser.permissions?.canManageFollowUps) {
      triggerToast('Access Denied: You do not have permission to delete follow-ups.', 'error');
      return;
    }
    const targetFup = followups.find(f => f.id === id);
    if (window.confirm('Are you sure you want to delete this follow-up call log?')) {
      try {
        await db.deleteFollowUp(id, currentUser?.email || 'System');
        triggerToast('Follow-up call log deleted successfully.', 'success');
        if (targetFup) {
          await triggerNotificationEvent(
            'status_change',
            'Follow-up Task Deleted',
            `The scheduled follow-up call for customer ${targetFup.customerName} has been deleted by ${currentUser?.name || 'Staff'}.`,
            targetFup.enquiryId,
            currentUser?.email
          );
        }
      } catch (e) {
        triggerToast('Failed to delete follow-up.', 'error');
      }
    }
  };

  // 5. CRM Quick Action Communication Outcomes
  const handleSaveQuickActionOutcome = async (outcome: {
    statusUpdate?: EnquiryStatus;
    notes: string;
    scheduleFollowUp?: boolean;
    followUpDate?: string;
  }) => {
    if (!quickActionDrawer) return;
    const { enquiry, type } = quickActionDrawer;

    try {
      // 1. Log an ActivityLog
      const actionTitle = type === 'Call' ? 'Recorded Call Outcome' : 'Recorded WhatsApp Outcome';
      const details = `[${type} Quick-Action] ${outcome.notes}`;
      await db.logActivity('followup', actionTitle, details, currentUser?.email || 'System');

      // 2. Update Enquiry status (if changed)
      if (outcome.statusUpdate) {
        await db.updateEnquiryStatusFromSubmodule(enquiry.id, outcome.statusUpdate, currentUser?.email || 'System');
        
        // Trigger status change notification
        await triggerNotificationEvent(
          'status_change',
          'Customer Pipeline Updated via Quick-Action',
          `Customer ${enquiry.customerName}'s pipeline level updated to "${outcome.statusUpdate}" via quick ${type} interface.`,
          enquiry.id,
          enquiry.assignedTo
        );
      }

      // 3. Complete any matching "Pending" follow-up logs for this enquiry
      const pendingFups = followups.filter(f => f.enquiryId === enquiry.id && f.status === 'Pending' && f.type === type);
      if (pendingFups.length > 0) {
        for (const fup of pendingFups) {
          await db.updateFollowUp(fup.id, {
            status: 'Completed',
            outcome: outcome.notes
          }, currentUser?.email || 'System');
        }
      }

      // 4. Create a new "Pending" follow-up log if requested
      if (outcome.scheduleFollowUp && outcome.followUpDate) {
        await db.addFollowUp({
          enquiryId: enquiry.id,
          customerName: enquiry.customerName,
          scheduledDate: outcome.followUpDate,
          type: type,
          status: 'Pending'
        }, currentUser?.email || 'System');
      }

      // 5. Reload database states
      
      triggerToast(`Successfully logged ${type} interaction outcome!`, 'success');
    } catch (err) {
      console.error('Error logging quick action outcome:', err);
      triggerToast('Failed to save communication outcome.', 'error');
    } finally {
      setQuickActionDrawer(null);
    }
  };

  // Navigate directly from dashboard stats widgets
  const handleDashboardCardNavigation = (tab: 'enquiry' | 'service' | 'demo' | 'followup' | 'installation', filterValue?: string) => {
    setActiveTab(tab);
    if (tab === 'enquiry') {
      if (filterValue === 'Today') {
        const todayStr = new Date().toISOString().split('T')[0];
        setSearchQuery(todayStr); // Put date in search to filter today's enquiries
      } else if (filterValue === 'Converted') {
        setStatusFilter('Converted');
      } else {
        setSearchQuery('');
        setStatusFilter('All');
      }
    }
  };

  // Process filters and sorts on the Customer Enquiry table
  const getFilteredEnquiries = () => {
    return enquiries
      .filter((e) => {
        // Recycle Bin Mode Toggle
        const isDeletedMatch = showRecycleBin ? (e.isDeleted === true) : (!e.isDeleted);
        if (!isDeletedMatch) return false;

        const query = searchQuery.toLowerCase().trim();
        const matchesSearch = 
          e.customerName.toLowerCase().includes(query) ||
          e.mobile.includes(query) ||
          (e.product && e.product.toLowerCase().includes(query)) ||
          (e.city && e.city.toLowerCase().includes(query)) ||
          e.createdAt.startsWith(query);

        const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
        const matchesCategory = categoryFilter === 'All' || e.product === categoryFilter;
        const matchesSource = sourceFilter === 'All' || e.source === sourceFilter;
        const matchesType = typeFilter === 'All' || e.enquiryType === typeFilter;

        return matchesSearch && matchesStatus && matchesCategory && matchesSource && matchesType;
      })
      .sort((a, b) => {
        let fieldA: string = '';
        let fieldB: string = '';

        if (sortBy === 'name') {
          fieldA = a.customerName.toLowerCase();
          fieldB = b.customerName.toLowerCase();
        } else if (sortBy === 'date') {
          fieldA = a.createdAt;
          fieldB = b.createdAt;
        } else if (sortBy === 'status') {
          fieldA = a.status;
          fieldB = b.status;
        }

        if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
        if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  };

  // Authentic CRM access boundary
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-[#1565C0] flex flex-col items-center justify-center z-50 overflow-hidden font-sans select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center px-6"
        >
          {/* Logo container with pulse & shadow */}
          <div className="relative mb-6">
            <motion.div
              className="absolute -inset-4 bg-white/20 rounded-full blur-xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <img
              src={paradiseLogo}
              alt="Paradise Group Logo"
              className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-2xl relative z-10"
              referrerPolicy="no-referrer"
              draggable="false"
            />
          </div>

          {/* App title */}
          <h1 className="text-white text-3xl font-extrabold tracking-tight font-display mb-2 drop-shadow-sm">
            PARADISE GROUP
          </h1>
          <p className="text-blue-100 text-xs font-semibold uppercase tracking-widest leading-none mb-8">
            Customer CRM Portal
          </p>

          {/* Android-style material linear loading bar */}
          <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden relative">
            <motion.div
              className="absolute top-0 bottom-0 left-0 bg-white rounded-full"
              initial={{ left: "-40%", width: "40%" }}
              animate={{ left: "100%", width: "40%" }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          <div className="absolute bottom-10 text-center">
            <p className="text-white/60 text-[10px] font-mono tracking-wider">
              VERSION 2.0.0 (PWA)
            </p>
            <p className="text-white/40 text-[9px] font-sans mt-1">
              Optimized for Android Standalone
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={isStandalone ? "w-full h-full bg-white flex flex-col font-sans select-none overflow-hidden relative" : "min-h-screen bg-slate-950 flex flex-col items-center justify-center p-0 md:p-6 text-slate-800 font-sans select-none overflow-hidden relative"}>
        {!isStandalone && (
          <>
            <div className="hidden md:block absolute top-10 left-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
            <div className="hidden md:block absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </>
        )}

        {/* Device frame container for login screen */}
        <div className={isStandalone ? "w-full h-full bg-white flex flex-col relative" : "w-full max-w-md h-[100dvh] md:h-[820px] bg-white border-x border-slate-200 md:rounded-[40px] md:border-[12px] md:border-slate-800 md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col relative"}>
          
          {/* Status bar */}
          {!isStandalone && (
            <div className="hidden md:flex absolute top-0 inset-x-0 h-7 bg-slate-950 z-50 items-center justify-between px-6 text-[9px] text-white font-mono select-none">
              <span>10:29 AM</span>
              <div className="w-24 h-4 bg-black rounded-b-xl absolute left-1/2 -translate-x-1/2 top-0" />
              <div className="flex items-center gap-1.5 opacity-80">
                <span className="material-icons text-[11px] leading-none">signal_cellular_alt</span>
                <span className="material-icons text-[11px] leading-none">wifi</span>
                <span className="material-icons text-[11px] leading-none">battery_full</span>
              </div>
            </div>
          )}

          <div className={`flex-1 flex flex-col h-full overflow-hidden ${isStandalone ? 'pt-0' : 'pt-0 md:pt-7'}`}>
            <LoginView onLogin={handleLogin} />
          </div>

          {/* Home indicator */}
          {!isStandalone && (
            <div className="hidden md:block h-5 bg-slate-100 flex items-center justify-center pb-1 shrink-0">
              <div className="w-28 h-1 bg-slate-300 rounded-full" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={isStandalone ? "w-full h-full bg-slate-50 flex flex-col font-sans select-none overflow-hidden relative" : "min-h-screen bg-slate-950 flex flex-col items-center justify-center p-0 md:p-6 text-slate-800 font-sans select-none overflow-hidden relative"}>
      {!isStandalone && (
        <>
          <div className="hidden md:block absolute top-10 left-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="hidden md:block absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </>
      )}

      {/* Device wrapper to simulate real mobile app on desktop, and fullscreen on real phone */}
      <div className={isStandalone ? "w-full h-full bg-slate-50 flex flex-col relative" : "w-full max-w-md h-[100dvh] md:h-[820px] bg-slate-50 border-x border-slate-200 md:rounded-[40px] md:border-[12px] md:border-slate-800 md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col relative"}>
        
        {/* Toast notifications positioned beautifully relative to phone frame */}
        {toast && (
          <div className={`absolute z-50 bg-slate-900/95 backdrop-blur-sm text-white px-4 py-3 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-2.5 animate-slide-up text-[11px] font-semibold ${isStandalone ? 'top-4 inset-x-4' : 'top-16 inset-x-4'}`}>
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="leading-tight">{toast.message}</span>
          </div>
        )}

        {/* Dynamic Island Status Bar */}
        {!isStandalone && (
          <div className="hidden md:flex absolute top-0 inset-x-0 h-7 bg-slate-950 z-50 items-center justify-between px-6 text-[9px] text-white font-mono select-none">
            <span>10:29 AM</span>
            <div className="w-24 h-4 bg-black rounded-b-xl absolute left-1/2 -translate-x-1/2 top-0" />
            <div className="flex items-center gap-1.5 opacity-80">
              <span className="material-icons text-[11px] leading-none">signal_cellular_alt</span>
              <span className="material-icons text-[11px] leading-none">wifi</span>
              <span className="material-icons text-[11px] leading-none">battery_full</span>
            </div>
          </div>
        )}

        {/* Outer App Screen Content */}
        <div className={`flex-1 flex flex-col h-full overflow-hidden relative ${isStandalone ? 'pt-0' : 'pt-0 md:pt-7'}`}>
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            
            {/* Header Navigation depending on active tab */}
            {['dashboard', 'enquiry', 'service', 'more'].includes(activeTab) ? (
              <header className="bg-white border-b border-slate-100 px-4 py-3.5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <img
                    id="header-logo"
                    src={paradiseLogo}
                    alt="Paradise Group Logo"
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm animate-none"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="font-extrabold text-xs tracking-tight font-display text-slate-900">PARADISE GROUP CRM</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Mobile Portal</span>
                      <span className="text-[8px] text-slate-300">•</span>
                      {!connectionStatus.isOnline ? (
                        <span className="inline-flex items-center gap-1 text-[9px] text-rose-600 font-extrabold uppercase tracking-wider animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Offline
                        </span>
                      ) : connectionStatus.isSyncing || connectionStatus.pendingCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[9px] text-amber-600 font-extrabold uppercase tracking-wider animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Syncing ({connectionStatus.pendingCount})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Cloud Synced
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Notification Center Trigger */}
                  <button
                    onClick={() => setIsNotificationPanelOpen(true)}
                    className="p-1.5 text-slate-400 hover:text-blue-700 rounded-lg hover:bg-slate-50 transition relative cursor-pointer"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4 text-slate-600 hover:text-blue-700" />
                    {notifications.filter(n => !n.isRead).length > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-rose-500 rounded-full border border-white flex items-center justify-center text-[8px] font-black text-white px-1 shadow-sm">
                        {notifications.filter(n => !n.isRead).length}
                      </span>
                    )}
                  </button>

                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-xs text-white uppercase shadow-sm">
                    {currentUser.name.charAt(0)}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </header>
            ) : (
              <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('more')}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  >
                    <span className="material-icons text-lg leading-none">arrow_back</span>
                  </button>
                  <div>
                    <h1 className="text-xs font-black font-display tracking-tight text-slate-900 uppercase">
                      {activeTab === 'demo' && 'Product Demonstrations'}
                      {activeTab === 'followup' && 'Client Follow-ups'}
                      {activeTab === 'reports' && 'Reports & Analytics'}
                      {activeTab === 'settings' && 'CRM Access Panel'}
                      {activeTab === 'installation' && 'Demo Installations'}
                    </h1>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] text-slate-400">
                        Back to More Menu
                      </p>
                      <span className="text-[8px] text-slate-300">•</span>
                      {!connectionStatus.isOnline ? (
                        <span className="inline-flex items-center gap-1 text-[9px] text-rose-600 font-extrabold uppercase tracking-wider animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Offline
                        </span>
                      ) : connectionStatus.isSyncing || connectionStatus.pendingCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[9px] text-amber-600 font-extrabold uppercase tracking-wider animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Syncing ({connectionStatus.pendingCount})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Cloud Synced
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-Header Notification Center Trigger */}
                <button
                  onClick={() => setIsNotificationPanelOpen(true)}
                  className="mr-3 p-1.5 text-slate-400 hover:text-blue-700 rounded-lg hover:bg-slate-50 transition relative cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4 text-slate-600 hover:text-blue-700" />
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-rose-500 rounded-full border border-white flex items-center justify-center text-[8px] font-black text-white px-1 shadow-sm">
                      {notifications.filter(n => !n.isRead).length}
                    </span>
                  )}
                </button>
              </header>
            )}

            {/* Notification Center Sliding Panel inside simulator */}
            {isNotificationPanelOpen && (
              <div className="absolute inset-0 bg-slate-950/40 z-50 flex justify-end">
                <div className="w-full h-full bg-slate-50 shadow-2xl animate-slide-left relative">
                  <NotificationCenter
                    currentUser={currentUser}
                    notifications={notifications}
                    onClose={() => setIsNotificationPanelOpen(false)}
                    onMarkRead={handleMarkNotifRead}
                    onMarkAllRead={handleMarkAllNotifsRead}
                    onClearAll={handleClearAllNotifs}
                    onActionClick={handleNotifActionClick}
                  />
                </div>
              </div>
            )}

            {/* Scrollable body content inside phone simulator */}
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              
              {/* Active profile timeline overlay */}
              {selectedEnquiryForProfile ? (
                <div className="mb-4 animate-slide-up">
                  <CustomerProfile
                    enquiry={selectedEnquiryForProfile}
                    onClose={() => setSelectedEnquiryForProfile(null)}
                    userEmail={currentUser.email}
                    onQuickAction={(enq, type) => setQuickActionDrawer({ isOpen: true, enquiry: enq, type })}
                  />
                </div>
              ) : null}

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full flex-1 flex flex-col"
                >
                  {/* Dashboard View */}
                  {activeTab === 'dashboard' && (
                    <DashboardView 
                      onCardClick={handleDashboardCardNavigation} 
                      userEmail={currentUser.email}
                      enquiries={enquiries}
                      services={services}
                      demos={demos}
                      followups={followups}
                      installations={installations}
                      activities={activities}
                      onRefresh={loadAllStores}
                      isSyncing={isSyncing}
                    />
                  )}

              {/* Enquiry View */}
              {activeTab === 'enquiry' && (
                <>
                  {isEnquiryFormOpen ? (
                    <div className="animate-slide-up bg-white p-4 rounded-2xl border">
                      <EnquiryForm
                        enquiry={editingEnquiry}
                        onSave={handleSaveEnquiry}
                        onCancel={() => { setIsEnquiryFormOpen(false); setEditingEnquiry(undefined); }}
                        creatorName={currentUser.name}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4 animate-fade-in pb-16">
                      {/* Search and Simple Status filter row */}
                      <div className="bg-white p-3 rounded-2xl border border-slate-100 space-y-2">
                        <div className="relative flex items-center">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                            <Search className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="text"
                            placeholder="Search customers..."
                            className="w-full text-xs pl-8 pr-10 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={startVoiceSearch}
                            className={`absolute right-2 p-1.5 rounded-lg transition cursor-pointer ${
                              isListening 
                                ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 animate-pulse' 
                                : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                            }`}
                            title="Search by speaking (Voice search)"
                          >
                            {isListening ? <MicOff className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Status:</span>
                            <select
                              className="text-[11px] border border-slate-100 rounded-xl px-2 py-1 bg-slate-50 w-full focus:outline-none font-medium"
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                            >
                              <option value="All">All Statuses</option>
                              <option value="New">New Lead</option>
                              <option value="Interested">Interested</option>
                              <option value="Cold">Cold</option>
                              <option value="Hot">Hot</option>
                              <option value="Service Logged">Service Logged</option>
                              <option value="Demo Scheduled">Demo Scheduled</option>
                              <option value="Converted">Converted (Sold)</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Product:</span>
                            <select
                              className="text-[11px] border border-slate-100 rounded-xl px-2 py-1 bg-slate-50 w-full focus:outline-none font-medium text-ellipsis overflow-hidden"
                              value={categoryFilter}
                              onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                              <option value="All">All Categories</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {currentUser.role === 'Admin' && (
                          <div className="pt-1 border-t border-slate-100 flex justify-between items-center">
                            <button
                              onClick={() => setShowRecycleBin(!showRecycleBin)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                                showRecycleBin 
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <Trash2 className="w-3 h-3" />
                              {showRecycleBin ? 'Exit Recycle Bin' : 'Recycle Bin (Admin)'}
                            </button>

                            {showRecycleBin && (
                              <span className="text-[10px] text-rose-500 font-medium italic animate-pulse">
                                Viewing soft-deleted enquiries (30 days)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Customer list card collection */}
                      <div className="space-y-3">
                        {getFilteredEnquiries().length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-400 italic bg-white rounded-2xl border">
                            No matching leads found.
                          </div>
                        ) : (
                          getFilteredEnquiries().map((e) => (
                            <div key={e.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col gap-3 shadow-sm hover:border-blue-200 transition">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <h4 className="font-bold text-slate-800 text-xs">{e.customerName}</h4>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">+91 {e.mobile}</p>
                                </div>
                                <div className="flex gap-1">
                                  {showRecycleBin ? (
                                    <>
                                      <button 
                                        onClick={() => handleRestoreEnquiry(e.id)} 
                                        className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-lg hover:bg-green-100 transition flex items-center gap-0.5 cursor-pointer"
                                        title="Restore Enquiry"
                                      >
                                        <Check className="w-3 h-3" />
                                        Restore
                                      </button>
                                      <button 
                                        onClick={() => handlePermanentlyDeleteEnquiry(e.id)} 
                                        className="px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-lg hover:bg-rose-100 transition flex items-center gap-0.5 cursor-pointer"
                                        title="Permanently Delete"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        Purge
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => setQuickActionDrawer({ isOpen: true, enquiry: e, type: 'Call' })}
                                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition cursor-pointer"
                                        title="Quick Call"
                                      >
                                        <Phone className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => setQuickActionDrawer({ isOpen: true, enquiry: e, type: 'WhatsApp' })}
                                        className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition cursor-pointer"
                                        title="Quick WhatsApp"
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                      </button>
                                      <button onClick={() => setSelectedEnquiryForProfile(e)} className="p-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                                        <Eye className="w-3 h-3" />
                                      </button>
                                      <button onClick={() => { setEditingEnquiry(e); setIsEnquiryFormOpen(true); }} className="p-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition">
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button onClick={() => handleDeleteEnquiry(e.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-slate-50 pt-2 text-slate-600 font-medium">
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Product</span>
                                  <span className="font-bold text-blue-800 truncate block">{e.product}</span> ({e.brand})
                                </div>
                                <div className="text-right">
                                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Next Contact</span>
                                  <span className="text-rose-600 font-semibold">{e.followUpDate}</span>
                                </div>
                              </div>

                              <div className="flex justify-between items-center bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100/50 text-[10px]">
                                <span className="text-[9px] font-bold text-slate-400">STATUS</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${
                                  e.status === 'Converted' ? 'bg-green-100 text-green-800' :
                                  e.status === 'Hot' ? 'bg-red-100 text-red-800' :
                                  e.status === 'Cold' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-800'
                                }`}>{e.status}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* FAB for enquiry */}
                      <button
                        onClick={() => { setEditingEnquiry(undefined); setIsEnquiryFormOpen(true); }}
                        className="fixed bottom-20 right-6 md:absolute md:bottom-20 md:right-6 bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition active:scale-95 cursor-pointer z-40"
                        title="Log New Enquiry"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Service View */}
              {activeTab === 'service' && (
                <div className="space-y-4 animate-fade-in pb-16">
                  {isServiceFormOpen ? (
                    <div className="bg-white p-4 rounded-2xl border">
                      <form onSubmit={handleCreateService} className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                          <h3 className="font-bold text-slate-900 text-xs">Log Service Ticket</h3>
                          <button type="button" onClick={() => setIsServiceFormOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Select Customer *</label>
                            <select
                              required
                              className="w-full text-xs p-2.5 border rounded-lg bg-white"
                              value={newServiceEnquiryId}
                              onChange={(e) => {
                                setNewServiceEnquiryId(e.target.value);
                                if (e.target.value !== 'custom') {
                                  setNewServiceCustomerName('');
                                  setNewServiceCustomerMobile('');
                                  setNewServiceProduct('');
                                }
                              }}
                            >
                              <option value="">-- Choose Customer --</option>
                              <option value="custom">Custom Customer (Manual Input)</option>
                              {enquiries.map(eq => (
                                <option key={eq.id} value={eq.id}>
                                  {eq.customerName} - {eq.brand} {eq.product}
                                </option>
                              ))}
                            </select>
                          </div>

                          {newServiceEnquiryId === 'custom' && (
                            <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="flex justify-between items-center border-b border-slate-150 pb-1.5 mb-1">
                                <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">Custom Customer Details</h4>
                                <button
                                  type="button"
                                  onClick={() => setIsServiceTruecallerOpen(true)}
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                                  <span>Truecaller Paste</span>
                                </button>
                              </div>

                              {/* Truecaller parser overlay for Services */}
                              {isServiceTruecallerOpen && (
                                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
                                    <div className="bg-gradient-to-r from-blue-700 to-blue-900 p-4 text-white flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-blue-200" />
                                        <h3 className="font-bold text-sm uppercase tracking-wider font-display">Service: Truecaller Auto Fill</h3>
                                      </div>
                                      <button 
                                        type="button" 
                                        onClick={() => { setIsServiceTruecallerOpen(false); setServiceTruecallerInput(''); setServiceTruecallerFeedback(null); }}
                                        className="text-white/80 hover:text-white text-xs font-bold"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    
                                    <div className="p-5 space-y-4 font-sans text-left">
                                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                                        <div>
                                          <strong>Tip:</strong> Paste Truecaller details block or link. We'll parse customer name, mobile number, and match against product categories to auto-populate the service ticket!
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                                          Paste Truecaller Text Block
                                        </label>
                                        <textarea
                                          rows={5}
                                          placeholder="Paste details here (e.g. Name, Mobile, Location, Search Link...)"
                                          className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
                                          value={serviceTruecallerInput}
                                          onChange={(e) => setServiceTruecallerInput(e.target.value)}
                                        />
                                      </div>

                                      {serviceTruecallerFeedback && (
                                        <div className="p-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                                          <Check className="w-4 h-4" />
                                          <span>{serviceTruecallerFeedback}</span>
                                        </div>
                                      )}

                                      <div className="flex justify-end gap-3 pt-2">
                                        <button
                                          type="button"
                                          onClick={() => { setIsServiceTruecallerOpen(false); setServiceTruecallerInput(''); }}
                                          className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleServiceTruecallerParse}
                                          className="px-4 py-2 bg-blue-700 text-white text-xs font-semibold rounded-xl hover:bg-blue-800 flex items-center gap-1.5 shadow cursor-pointer"
                                        >
                                          <ClipboardList className="w-3.5 h-3.5" />
                                          <span>Process & Auto-Fill</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div>
                                <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Customer Name *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="E.g., Pritam Singh"
                                  className="w-full text-xs p-2 border rounded-lg bg-white focus:outline-none"
                                  value={newServiceCustomerName}
                                  onChange={(e) => setNewServiceCustomerName(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Customer Mobile *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="E.g., 9876543210"
                                  className="w-full text-xs p-2 border rounded-lg bg-white focus:outline-none"
                                  value={newServiceCustomerMobile}
                                  onChange={(e) => setNewServiceCustomerMobile(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Product Details (Optional)</label>
                                <input
                                  type="text"
                                  placeholder="E.g., LG Smart TV 43 inch"
                                  className="w-full text-xs p-2 border rounded-lg bg-white focus:outline-none"
                                  value={newServiceProduct}
                                  onChange={(e) => setNewServiceProduct(e.target.value)}
                                />
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Issue (Optional)</label>
                            <textarea
                              rows={2}
                              placeholder="Describe problem..."
                              className="w-full text-xs p-2.5 border rounded-lg focus:outline-none"
                              value={newServiceIssue}
                              onChange={(e) => setNewServiceIssue(e.target.value)}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Technician</label>
                              <input
                                type="text"
                                placeholder="Tech name"
                                className="w-full text-xs p-2.5 border rounded-lg"
                                value={newServiceTech}
                                onChange={(e) => setNewServiceTech(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Fee (₹)</label>
                              <input
                                type="number"
                                placeholder="Expected cost"
                                className="w-full text-xs p-2.5 border rounded-lg"
                                value={newServiceCharges}
                                onChange={(e) => setNewServiceCharges(Number(e.target.value))}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Attach Image</label>
                              <label className="flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition border border-slate-200">
                                <span>{newServiceImageName ? 'Change Image' : 'Choose Image'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = () => {
                                        setNewServiceImageData(reader.result as string);
                                        setNewServiceImageName(file.name);
                                        triggerToast('Image uploaded!', 'success');
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                              {newServiceImageName && <span className="text-[9px] text-slate-500 truncate block mt-0.5 max-w-[150px]">{newServiceImageName}</span>}
                            </div>

                            <div>
                              <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Attach PDF</label>
                              <label className="flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition border border-slate-200">
                                <span>{newServicePdfName ? 'Change PDF' : 'Choose PDF'}</span>
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = () => {
                                        setNewServicePdfData(reader.result as string);
                                        setNewServicePdfName(file.name);
                                        triggerToast('PDF attached!', 'success');
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                              {newServicePdfName && <span className="text-[9px] text-slate-500 truncate block mt-0.5 max-w-[150px]">{newServicePdfName}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2 border-t">
                          <button type="button" onClick={() => setIsServiceFormOpen(false)} className="px-3 py-1.5 border rounded-lg text-[11px] font-semibold">Cancel</button>
                          <button type="submit" className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-[11px] font-semibold">Save Ticket</button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {services.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-400 italic bg-white rounded-2xl border">
                            No active service tickets.
                          </div>
                        ) : (
                          services.map(srv => (
                            <div key={srv.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                              <div className="flex justify-between items-center pb-2 border-b">
                                <span className="font-mono text-[9px] text-slate-400 font-bold"># {srv.id}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                                  srv.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                  srv.status === 'In Progress' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'
                                }`}>{srv.status}</span>
                              </div>

                              <div className="text-xs space-y-1 text-slate-700">
                                <p className="font-extrabold text-slate-900">{srv.customerName}</p>
                                {srv.customerMobile && (
                                  <p className="text-[10px] text-slate-400 font-mono">+91 {srv.customerMobile}</p>
                                )}
                                <p className="font-bold text-blue-800 text-[11px]">{srv.product}</p>
                                <p className="text-slate-600 leading-relaxed italic bg-slate-50 p-2 rounded-xl mt-1 text-[11px] border border-slate-100/50">&quot;{srv.issue}&quot;</p>
                                
                                {srv.imageData && (
                                  <div className="mt-2">
                                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Attached Image</span>
                                    <img src={srv.imageData} alt={srv.imageName || 'Service Image'} className="w-full max-h-32 object-contain rounded-xl border border-slate-100 bg-slate-50" referrerPolicy="no-referrer" />
                                  </div>
                                )}

                                {srv.pdfData && (
                                  <div className="mt-2 flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl border text-[10px]">
                                    <span className="font-semibold text-slate-600 truncate flex-1">📄 {srv.pdfName || 'Service Document'}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = srv.pdfData!;
                                        link.download = srv.pdfName || 'service-document.pdf';
                                        link.click();
                                      }}
                                      className="text-blue-600 hover:underline font-bold shrink-0"
                                    >
                                      Download
                                    </button>
                                  </div>
                                )}

                                <div className="pt-1.5 text-[9px] text-slate-400 flex justify-between">
                                  <span>Tech: <strong className="text-slate-600">{srv.technicianName || 'Unassigned'}</strong></span>
                                  <span>Fee: <strong className="text-slate-600">₹{srv.charges || 0}</strong></span>
                                </div>
                              </div>

                              <div className="flex gap-2 pt-2 border-t">
                                <button
                                  onClick={() => handleUpdateServiceStatus(srv.id, 'In Progress')}
                                  className="flex-1 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-[10px] font-bold rounded-xl transition"
                                >
                                  Work On
                                </button>
                                <button
                                  onClick={() => handleUpdateServiceStatus(srv.id, 'Completed')}
                                  className="flex-1 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-bold rounded-xl transition"
                                >
                                  Resolve
                                </button>
                                <button
                                  onClick={() => handleUpdateServiceStatus(srv.id, 'Cancelled')}
                                  className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-xl"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                                <button
                                  onClick={() => handleDeleteService(srv.id)}
                                  className="p-1.5 hover:bg-red-50 text-red-500 rounded-xl transition cursor-pointer"
                                  title="Delete Service Ticket"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* FAB for service */}
                      <button
                        onClick={() => setIsServiceFormOpen(true)}
                        className="fixed bottom-20 right-6 md:absolute md:bottom-20 md:right-6 bg-orange-600 hover:bg-orange-700 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition active:scale-95 cursor-pointer z-40"
                        title="Log Repair Ticket"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* More Tab Sub-menu */}
              {activeTab === 'more' && (
                <div className="space-y-4 animate-fade-in pb-16">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                        {currentUser.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-xs">{currentUser.name}</h3>
                        <p className="text-[10px] text-slate-400 italic mt-0.5">{currentUser.email} • {currentUser.role}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <button
                        onClick={() => setActiveTab('demo')}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100/50 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-icons text-base text-yellow-500 bg-yellow-50 p-2 rounded-xl">play_circle</span>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Product Demos</span>
                            <span className="text-[9px] text-slate-400 block">Schedule customer demos</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="bg-yellow-100 text-yellow-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            {demos.length}
                          </span>
                          <span className="material-icons text-slate-300 text-xs">chevron_right</span>
                        </div>
                      </button>

                      <button
                        onClick={() => setActiveTab('installation')}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100/50 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-icons text-base text-blue-600 bg-blue-50 p-2 rounded-xl">construction</span>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Demo Installations</span>
                            <span className="text-[9px] text-slate-400 block">Product setups &amp; PDF handovers</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            {installations.length}
                          </span>
                          <span className="material-icons text-slate-300 text-xs">chevron_right</span>
                        </div>
                      </button>

                      <button
                        onClick={() => setActiveTab('followup')}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100/50 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-icons text-base text-rose-500 bg-rose-50 p-2 rounded-xl">phone_forwarded</span>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Client Follow-ups</span>
                            <span className="text-[9px] text-slate-400 block">Calls and targets list</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            {followups.filter(f => f.status === 'Pending').length}
                          </span>
                          <span className="material-icons text-slate-300 text-xs">chevron_right</span>
                        </div>
                      </button>

                      <button
                        onClick={() => setActiveTab('reports')}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100/50 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-icons text-base text-emerald-500 bg-emerald-50 p-2 rounded-xl">query_stats</span>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Reports &amp; Analytics</span>
                            <span className="text-[9px] text-slate-400 block">Performance data</span>
                          </div>
                        </div>
                        <span className="material-icons text-slate-300 text-xs">chevron_right</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('settings')}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100/50 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-icons text-base text-purple-500 bg-purple-50 p-2 rounded-xl">people_outline</span>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Staff &amp; Settings</span>
                            <span className="text-[9px] text-slate-400 block">Users access logs</span>
                          </div>
                        </div>
                        <span className="material-icons text-slate-300 text-xs">chevron_right</span>
                      </button>
                    </div>
                  </div>



                  <button
                    onClick={handleLogout}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>End Current Session</span>
                  </button>
                </div>
              )}

              {/* Demo Log View */}
              {activeTab === 'demo' && (
                <div className="space-y-4 animate-fade-in pb-16">
                  {isDemoFormOpen ? (
                    <div className="bg-white p-4 rounded-2xl border">
                      <form onSubmit={handleCreateDemo} className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                          <h3 className="font-bold text-slate-900 text-xs">Schedule Demonstration</h3>
                          <button type="button" onClick={() => setIsDemoFormOpen(false)} className="text-slate-400 text-xs">✕</button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Select Customer *</label>
                            <select
                              required
                              className="w-full text-xs p-2 border rounded-lg bg-white"
                              value={newDemoEnquiryId}
                              onChange={(e) => setNewDemoEnquiryId(e.target.value)}
                            >
                              <option value="">-- Choose Customer --</option>
                              {enquiries.map(eq => (
                                <option key={eq.id} value={eq.id}>
                                  {eq.customerName} - {eq.brand} {eq.product}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Date *</label>
                              <input
                                type="date"
                                required
                                className="w-full text-xs p-2 border rounded-lg bg-white"
                                value={newDemoDate}
                                onChange={(e) => setNewDemoDate(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Demonstrator</label>
                              <input
                                type="text"
                                className="w-full text-xs p-2 border rounded-lg"
                                value={newDemoDemonstrator}
                                onChange={(e) => setNewDemoDemonstrator(e.target.value)}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Feedback/Notes</label>
                            <textarea
                              rows={2}
                              className="w-full text-xs p-2 border rounded-lg focus:outline-none"
                              value={newDemoFeedback}
                              onChange={(e) => setNewDemoFeedback(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2 border-t">
                          <button type="button" onClick={() => setIsDemoFormOpen(false)} className="px-3 py-1.5 border rounded-lg text-[11px] font-semibold">Cancel</button>
                          <button type="submit" className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-[11px] font-semibold">Schedule Demo</button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {demos.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-400 italic bg-white rounded-2xl border">
                            No product demonstrations scheduled.
                          </div>
                        ) : (
                          demos.map(dm => (
                            <div key={dm.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                              <div className="flex justify-between items-center pb-2 border-b">
                                <span className="font-mono text-[9px] text-slate-400 font-bold"># {dm.id}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                                  dm.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                  dm.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-700'
                                }`}>{dm.status}</span>
                              </div>

                              <div className="text-xs space-y-1 text-slate-700">
                                <p className="font-extrabold text-slate-900">{dm.customerName}</p>
                                <p className="font-bold text-blue-800 text-[11px]">{dm.brand} {dm.product}</p>
                                <p className="text-slate-500 font-semibold flex items-center gap-1 text-[10px]">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Date: {dm.scheduledDate}
                                </p>
                                {dm.feedback && <p className="text-slate-600 italic bg-slate-50 p-2 rounded-xl mt-1 text-[11px] border border-slate-100/50">&quot;{dm.feedback}&quot;</p>}
                              </div>

                              <div className="flex gap-2 pt-2 border-t">
                                <button
                                  onClick={() => handleUpdateDemoStatus(dm.id, 'Completed')}
                                  className="flex-1 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-100 text-[10px] font-bold rounded-xl transition cursor-pointer"
                                >
                                  Completed
                                </button>
                                <button
                                  onClick={() => handleUpdateDemoStatus(dm.id, 'No Show')}
                                  className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100 text-[10px] font-bold rounded-xl transition cursor-pointer"
                                >
                                  No Show
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* FAB for demo */}
                      <button
                        onClick={() => setIsDemoFormOpen(true)}
                        className="fixed bottom-20 right-6 md:absolute md:bottom-20 md:right-6 bg-yellow-600 hover:bg-yellow-700 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition active:scale-95 cursor-pointer z-40"
                        title="Schedule Demo"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Follow-up View */}
              {activeTab === 'followup' && (
                <div className="space-y-4 animate-fade-in pb-16">
                  {isFollowUpModalOpen && selectedFollowUp && (
                    <div className="bg-white p-4 rounded-2xl border">
                      <form onSubmit={handleCompleteFollowUp} className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                          <h3 className="font-bold text-slate-900 text-xs">Document Outcome</h3>
                          <button type="button" onClick={() => { setIsFollowUpModalOpen(false); setSelectedFollowUp(null); }} className="text-slate-400 text-xs">✕</button>
                        </div>

                        <div className="space-y-2 text-[11px] text-slate-600 font-medium">
                          <p><strong>Customer:</strong> {selectedFollowUp.customerName}</p>
                          <p><strong>Scheduled Date:</strong> {selectedFollowUp.scheduledDate}</p>
                          <p><strong>Type:</strong> {selectedFollowUp.type}</p>

                          <div className="pt-2">
                            <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Outcome Notes *</label>
                            <textarea
                              required
                              rows={2}
                              placeholder="What did they say?"
                              className="w-full text-xs p-2 border rounded-lg focus:outline-none bg-slate-50"
                              value={followUpOutcome}
                              onChange={(e) => setFollowUpOutcome(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                          <button type="button" onClick={() => { setIsFollowUpModalOpen(false); setSelectedFollowUp(null); }} className="px-3 py-1.5 border rounded-lg text-[11px] font-semibold">Cancel</button>
                          <button type="submit" className="px-3 py-1.5 bg-green-700 text-white rounded-lg text-[11px] font-semibold">Complete</button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="space-y-3">
                    {followups.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 italic bg-white rounded-2xl border">
                        No pending follow-ups logged.
                      </div>
                    ) : (
                      followups.map(fup => (
                        <div key={fup.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800">{fup.customerName}</span>
                            <span className="text-[10px] text-rose-600 font-semibold">{fup.scheduledDate}</span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-500">
                            <span className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-md text-[9px] uppercase">{fup.type}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                              fup.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>{fup.status}</span>
                          </div>

                          {fup.outcome && (
                            <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100/50">&quot;{fup.outcome}&quot;</p>
                          )}

                          {fup.status === 'Pending' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const linkedEnq = enquiries.find(eq => eq.id === fup.enquiryId);
                                  if (linkedEnq) {
                                    setQuickActionDrawer({
                                      isOpen: true,
                                      enquiry: linkedEnq,
                                      type: fup.type === 'WhatsApp' ? 'WhatsApp' : 'Call'
                                    });
                                  } else {
                                    setSelectedFollowUp(fup);
                                    setIsFollowUpModalOpen(true);
                                  }
                                }}
                                className="flex-1 py-1.5 bg-green-700 hover:bg-green-800 text-white text-[10px] font-bold rounded-xl transition cursor-pointer"
                              >
                                Log {fup.type} Outcome
                              </button>
                              <button
                                onClick={() => handleDeleteFollowUp(fup.id)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-[10px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center"
                                title="Delete Follow-up"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleDeleteFollowUp(fup.id)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-[10px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                                title="Delete Follow-up"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Log</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Reports View */}
              {activeTab === 'reports' && (
                <div className="pb-16">
                  <ReportsView userEmail={currentUser.email} />
                </div>
              )}

              {/* Settings View */}
              {activeTab === 'settings' && (
                <div className="pb-16">
                  <SettingsView 
                    currentUser={currentUser} 
                    userEmail={currentUser.email} 
                    onRefreshSession={loadAllStores} 
                    isStandalone={isStandalone}
                    onInstallApp={handleInstallApp}
                    installAvailable={!!deferredPrompt}
                  />
                </div>
              )}

              {/* Demo Installation View */}
              {activeTab === 'installation' && (
                <div className="pb-16">
                  <DemoInstallationView
                    currentUser={currentUser}
                    enquiries={enquiries}
                    onTriggerNotification={triggerNotificationEvent}
                    triggerToast={triggerToast}
                  />
                </div>
              )}

                </motion.div>
              </AnimatePresence>

            </div>

            {/* Bottom Tab Bar Navigation */}
            <nav className="h-16 bg-white border-t border-slate-100 flex items-center justify-around shrink-0 relative z-30 shadow-lg px-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 flex flex-col items-center justify-center h-full gap-1 transition-all cursor-pointer ${
                  activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="material-icons text-lg leading-none">home</span>
                <span className="text-[9px] font-extrabold uppercase tracking-wide leading-none">Home</span>
              </button>

              <button
                onClick={() => setActiveTab('enquiry')}
                className={`flex-1 flex flex-col items-center justify-center h-full gap-1 transition-all cursor-pointer ${
                  activeTab === 'enquiry' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="material-icons text-lg leading-none">assignment</span>
                <span className="text-[9px] font-extrabold uppercase tracking-wide leading-none">Leads</span>
              </button>

              <button
                onClick={() => setActiveTab('service')}
                className={`flex-1 flex flex-col items-center justify-center h-full gap-1 transition-all cursor-pointer ${
                  activeTab === 'service' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="material-icons text-lg leading-none">construction</span>
                <span className="text-[9px] font-extrabold uppercase tracking-wide leading-none">Services</span>
              </button>

              <button
                onClick={() => setActiveTab('more')}
                className={`flex-1 flex flex-col items-center justify-center h-full gap-1 transition-all cursor-pointer ${
                  ['more', 'demo', 'followup', 'reports', 'settings'].includes(activeTab) ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="material-icons text-lg leading-none">more_horiz</span>
                <span className="text-[9px] font-extrabold uppercase tracking-wide leading-none">More</span>
              </button>
            </nav>

            {/* Quick Action Bottom Drawer Overlay */}
            <AnimatePresence>
              {quickActionDrawer && quickActionDrawer.isOpen && (
                <QuickActionDrawer
                  isOpen={quickActionDrawer.isOpen}
                  enquiry={quickActionDrawer.enquiry}
                  type={quickActionDrawer.type}
                  onClose={() => setQuickActionDrawer(null)}
                  onSaveOutcome={handleSaveQuickActionOutcome}
                />
              )}
            </AnimatePresence>

            {/* Custom Delete Enquiry Confirmation Modal */}
            <AnimatePresence>
              {enquiryToDelete && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden font-sans"
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-3 text-amber-600">
                        <div className="p-3 bg-amber-50 rounded-full">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">Move to Recycle Bin?</h3>
                      </div>
                      
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Are you sure you want to move this customer enquiry to the Recycle Bin? 
                        <strong className="text-slate-600 block mt-1 font-semibold">It will be stored safely in the 30-day recycle bin and can be restored by any Admin.</strong>
                      </p>
                      
                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          onClick={() => setEnquiryToDelete(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={confirmDeleteEnquiry}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm shadow-amber-100"
                        >
                          Move to Recycle Bin
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Custom Permanent Purge Enquiry Confirmation Modal */}
            <AnimatePresence>
              {enquiryToPurge && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden font-sans"
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-3 text-red-600">
                        <div className="p-3 bg-red-50 rounded-full">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">Permanently Delete Enquiry?</h3>
                      </div>
                      
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Are you absolutely sure you want to permanently delete this customer enquiry? 
                        <strong className="text-red-600 block mt-1 font-semibold">This is irreversible! This will permanently purge all associated service tickets, scheduled demos, installations, and follow-ups from the secure cloud database.</strong>
                      </p>
                      
                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          onClick={() => setEnquiryToPurge(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={confirmPurgeEnquiry}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm shadow-red-100"
                        >
                          Yes, Purge Irreversibly
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Custom Delete Service Ticket Confirmation Modal */}
            <AnimatePresence>
              {serviceToDelete && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden font-sans"
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-3 text-red-600">
                        <div className="p-3 bg-red-50 rounded-full">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">Delete Service Ticket?</h3>
                      </div>
                      
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Are you sure you want to permanently delete this service ticket? 
                        <strong className="text-red-600 block mt-1 font-semibold">This action is irreversible. All details associated with this repair ticket will be removed.</strong>
                      </p>
                      
                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          onClick={() => setServiceToDelete(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={confirmDeleteService}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm shadow-red-100"
                        >
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Home Indicator line on desktop */}
        {!isStandalone && (
          <div className="hidden md:block h-5 bg-slate-100 flex items-center justify-center pb-1 shrink-0">
            <div className="w-28 h-1 bg-slate-300 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
