import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  get, 
  set, 
  remove, 
  update, 
  onValue, 
  off 
} from 'firebase/database';
import { 
  Enquiry, ServiceLog, DemoLog, FollowUpLog, Staff, ActivityLog, 
  CRMDashboardStats, EnquiryStatus, DemoInstallation, Category
} from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase Client SDK
const app = initializeApp(firebaseConfig);
const config = firebaseConfig as any;
const dbUrl = config.databaseURL;
if (!dbUrl) {
  throw new Error("Missing databaseURL in firebase-applet-config.json");
}
export const database = getDatabase(app, dbUrl);

// Initial pre-seeded data for Electronics Retail CRM (Paradise Group)
const INITIAL_STAFF: Staff[] = [
  {
    id: 'staff-1',
    name: 'Prabhakar Choubey',
    email: 'choubey910@gmail.com',
    role: 'Admin',
    status: 'Active',
    createdAt: '2026-06-15T09:00:00Z',
    permissions: {
      canAddEnquiry: true,
      canEditEnquiry: true,
      canDeleteEnquiry: true,
      canManageServices: true,
      canManageDemos: true,
      canManageFollowUps: true,
      canViewReports: true,
      canExportCSV: true
    }
  },
  {
    id: 'staff-2',
    name: 'Staff',
    email: 'staff@paradise.com',
    role: 'Staff',
    status: 'Active',
    createdAt: '2026-06-16T10:30:00Z',
    permissions: {
      canAddEnquiry: true,
      canEditEnquiry: true,
      canDeleteEnquiry: true,
      canManageServices: true,
      canManageDemos: true,
      canManageFollowUps: true,
      canViewReports: true,
      canExportCSV: false
    }
  },
  {
    id: 'staff-3',
    name: 'Rohit Verma',
    email: 'rohit@paradise.com',
    role: 'Staff',
    status: 'Active',
    createdAt: '2026-06-18T14:15:00Z',
    permissions: {
      canAddEnquiry: true,
      canEditEnquiry: false,
      canDeleteEnquiry: false,
      canManageServices: false,
      canManageDemos: true,
      canManageFollowUps: true,
      canViewReports: false,
      canExportCSV: false
    }
  }
];

const INITIAL_CATEGORIES: Category[] = [
  "AC", "Air Fryer", "Almirah", "Battery", "Blower", "Book Cabinet", "CCTV", "Chair", "Chimney", "Clock",
  "Cooker", "Cooktop", "Cooler", "Deep Freezer", "Desktop", "Dining Table", "Fan", "Fridge", "Geyser", "Heater",
  "Home Theater", "Induction", "Inverter", "Iron", "JMG", "Juicer", "Kettle", "Laptop", "LED", "Mattress",
  "Microwave", "Mixer Grinder", "Mobile", "Oil Filled Heater", "Other", "Pillow", "Printer", "RO System", "Sandwich Maker", "Shoe Cabinet",
  "Stabilizer", "Stool", "Tea Table", "Toaster", "Trolley", "Vacuum Cleaner", "Visi Cooler", "Washing Machine", "Water Purifier", "Wrist Watch"
].map((name, index) => ({
  id: `cat-${index + 1}`,
  name,
  createdAt: '2026-06-15T09:00:00Z'
}));

// Local cache structures
let localCache: {
  enquiries: Record<string, Enquiry>;
  services: Record<string, ServiceLog>;
  demos: Record<string, DemoLog>;
  followups: Record<string, FollowUpLog>;
  installations: Record<string, DemoInstallation>;
  activities: Record<string, ActivityLog>;
  categories: Record<string, Category>;
  staff: Record<string, Staff>;
} = {
  enquiries: {},
  services: {},
  demos: {},
  followups: {},
  installations: {},
  activities: {},
  categories: {},
  staff: {}
};

// Queue of pending mutations
interface PendingMutation {
  id: string; // unique id
  timestamp: string;
  table: keyof typeof localCache;
  action: 'set' | 'update' | 'remove';
  recordId: string;
  data?: any;
}

let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let isSyncing = false;
let pendingQueue: PendingMutation[] = [];
const statusSubscribers: ((status: { isOnline: boolean, isSyncing: boolean, pendingCount: number }) => void)[] = [];
const tableCallbacks: Record<string, ((data: any[]) => void)[]> = {
  enquiries: [],
  services: [],
  demos: [],
  followups: [],
  installations: [],
  activities: [],
  categories: [],
  staff: []
};

// Loading and saving local cache
function loadLocalCache() {
  const tables: (keyof typeof localCache)[] = ['enquiries', 'services', 'demos', 'followups', 'installations', 'activities', 'categories', 'staff'];
  tables.forEach(table => {
    try {
      const data = localStorage.getItem(`crm_cache_${table}`);
      if (data) {
        localCache[table] = JSON.parse(data);
      } else {
        localCache[table] = {};
      }
    } catch (e) {
      console.error(`Error loading cache for ${table}:`, e);
      localCache[table] = {};
    }
  });

  // Seed defaults if empty
  if (Object.keys(localCache.staff).length === 0) {
    INITIAL_STAFF.forEach(s => {
      localCache.staff[s.id] = s;
    });
    saveLocalCache('staff');
  }

  if (Object.keys(localCache.categories).length === 0) {
    INITIAL_CATEGORIES.forEach(c => {
      localCache.categories[c.id] = c;
    });
    saveLocalCache('categories');
  }
}

function saveLocalCache(table: keyof typeof localCache) {
  try {
    localStorage.setItem(`crm_cache_${table}`, JSON.stringify(localCache[table]));
  } catch (e) {
    console.error(`Error saving cache for ${table}:`, e);
  }
}

// Load pending queue from localStorage on start
try {
  if (typeof window !== 'undefined') {
    const savedQueue = localStorage.getItem('crm_pending_mutations');
    if (savedQueue) {
      pendingQueue = JSON.parse(savedQueue);
    }
  }
} catch (e) {
  console.error('Error loading pending mutations:', e);
}

function savePendingQueue() {
  try {
    localStorage.setItem('crm_pending_mutations', JSON.stringify(pendingQueue));
  } catch (e) {
    console.error('Error saving pending mutations:', e);
  }
}

function notifyStatusSubscribers() {
  statusSubscribers.forEach(cb => cb({ isOnline, isSyncing, pendingCount: pendingQueue.length }));
}

function triggerTableCallbacks(table: keyof typeof localCache) {
  const callbacks = tableCallbacks[table];
  if (!callbacks) return;

  let dataArray: any[] = [];
  if (table === 'activities') {
    dataArray = Object.values(localCache.activities).sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } else if (table === 'categories') {
    dataArray = Object.values(localCache.categories).sort((a: any, b: any) => 
      a.name.localeCompare(b.name)
    );
  } else {
    dataArray = Object.values(localCache[table]);
  }

  callbacks.forEach(cb => {
    try {
      cb(dataArray);
    } catch (e) {
      console.error(`Error in callback for ${table}:`, e);
    }
  });
}

// Merge remote updates with local cache while preserving pending mutations
function mergeRemoteData(table: keyof typeof localCache, remoteData: any) {
  if (!remoteData) {
    remoteData = {};
  }
  
  const pendingRecordIds = new Set(
    pendingQueue
      .filter(m => m.table === table)
      .map(m => m.recordId)
  );

  const updatedCache: Record<string, any> = {};

  // Keep remote values unless pending locally
  Object.entries(remoteData).forEach(([id, item]: [string, any]) => {
    if (pendingRecordIds.has(id)) {
      if (localCache[table][id]) {
        updatedCache[id] = localCache[table][id];
      }
    } else {
      updatedCache[id] = { id, ...item };
    }
  });

  // Keep pending local additions that are not yet on remote
  Object.entries(localCache[table]).forEach(([id, item]: [string, any]) => {
    if (pendingRecordIds.has(id) && !updatedCache[id]) {
      updatedCache[id] = item;
    }
  });

  localCache[table] = updatedCache;
  saveLocalCache(table);
  triggerTableCallbacks(table);
}

// Queue mutations to process locally instantly and sync with remote
async function queueMutation(
  table: keyof typeof localCache,
  action: 'set' | 'update' | 'remove',
  recordId: string,
  data?: any
) {
  // Apply directly to local cache
  if (action === 'set' || action === 'update') {
    localCache[table][recordId] = {
      ...localCache[table][recordId],
      ...data,
      id: recordId
    } as any;
  } else if (action === 'remove') {
    delete localCache[table][recordId];
  }
  
  saveLocalCache(table);
  triggerTableCallbacks(table);

  // Push mutation to queue
  const mutation: PendingMutation = {
    id: `${table}_${recordId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    table,
    action,
    recordId,
    data
  };
  pendingQueue.push(mutation);
  savePendingQueue();
  notifyStatusSubscribers();

  if (isOnline) {
    processPendingQueue();
  }
}

// Process pending queue sequentially
let isProcessingQueue = false;
async function processPendingQueue() {
  if (isProcessingQueue || pendingQueue.length === 0) return;
  isProcessingQueue = true;
  isSyncing = true;
  notifyStatusSubscribers();

  try {
    while (pendingQueue.length > 0) {
      if (!isOnline) {
        break;
      }
      const mutation = pendingQueue[0];
      try {
        const refPath = ref(database, `${mutation.table}/${mutation.recordId}`);
        if (mutation.action === 'set') {
          await set(refPath, mutation.data);
        } else if (mutation.action === 'update') {
          const snapshot = await get(refPath);
          const existing = snapshot.val() || {};
          await set(refPath, { ...existing, ...mutation.data });
        } else if (mutation.action === 'remove') {
          await remove(refPath);
        }
        
        pendingQueue.shift();
        savePendingQueue();
        notifyStatusSubscribers();
      } catch (err) {
        console.error('Error processing mutation, will retry later:', err);
        break;
      }
    }
  } finally {
    isProcessingQueue = false;
    isSyncing = false;
    notifyStatusSubscribers();
  }
}

// Connection event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    notifyStatusSubscribers();
    processPendingQueue();
  });
  window.addEventListener('offline', () => {
    isOnline = false;
    notifyStatusSubscribers();
  });
  
  // Load cache on startup
  loadLocalCache();
}

// Helper to subscribe to table and leverage offline local caching with deduplicated Firebase listeners
const activeFirebaseListeners: Record<string, { refPath: any; listener: any }> = {};

function subscribeToTable(table: keyof typeof localCache, callback: (data: any[]) => void) {
  tableCallbacks[table].push(callback);
  
  // Return cached values instantly
  triggerTableCallbacks(table);

  // Prevent duplicate Firebase listeners on the same reference path
  if (!activeFirebaseListeners[table]) {
    const refPath = ref(database, table);
    const listener = onValue(refPath, (snapshot) => {
      const val = snapshot.val();
      mergeRemoteData(table, val);
    }, (error) => {
      console.warn(`Firebase subscription error for ${table}:`, error);
    });
    activeFirebaseListeners[table] = { refPath, listener };
  }

  return () => {
    tableCallbacks[table] = tableCallbacks[table].filter(cb => cb !== callback);
    
    // Cleanup Firebase listeners when there are zero active subscribers to avoid memory leaks
    if (tableCallbacks[table].length === 0 && activeFirebaseListeners[table]) {
      const { refPath, listener } = activeFirebaseListeners[table];
      try {
        off(refPath, 'value', listener);
      } catch (e) {
        console.warn(`Error during off() call for table ${table}:`, e);
      }
      delete activeFirebaseListeners[table];
    }
  };
}

export const db = {
  // Connection and synchronization metrics
  subscribeToConnectionStatus: (callback: (status: { isOnline: boolean, isSyncing: boolean, pendingCount: number }) => void) => {
    statusSubscribers.push(callback);
    callback({ isOnline, isSyncing, pendingCount: pendingQueue.length });
    return () => {
      const idx = statusSubscribers.indexOf(callback);
      if (idx !== -1) {
        statusSubscribers.splice(idx, 1);
      }
    };
  },

  // Real-time Database subscriptions with fallback
  subscribeToEnquiries: (callback: (data: Enquiry[]) => void) => {
    return subscribeToTable('enquiries', callback);
  },

  subscribeToServices: (callback: (data: ServiceLog[]) => void) => {
    return subscribeToTable('services', callback);
  },

  subscribeToDemos: (callback: (data: DemoLog[]) => void) => {
    return subscribeToTable('demos', callback);
  },

  subscribeToFollowUps: (callback: (data: FollowUpLog[]) => void) => {
    return subscribeToTable('followups', callback);
  },

  subscribeToInstallations: (callback: (data: DemoInstallation[]) => void) => {
    return subscribeToTable('installations', callback);
  },

  subscribeToActivities: (callback: (data: ActivityLog[]) => void) => {
    return subscribeToTable('activities', callback);
  },

  subscribeToCategories: (callback: (data: Category[]) => void) => {
    return subscribeToTable('categories', callback);
  },

  subscribeToStaff: (callback: (data: Staff[]) => void) => {
    return subscribeToTable('staff', callback);
  },

  // Staff and Permissions
  getStaff: async (): Promise<Staff[]> => {
    return Object.values(localCache.staff);
  },

  updateStaffPermissions: async (id: string, permissions: Staff['permissions']): Promise<Staff[]> => {
    const oldStaff = localCache.staff[id];
    if (oldStaff) {
      await queueMutation('staff', 'set', id, { ...oldStaff, permissions });
    }
    await db.logActivity('staff', 'Updated Staff Permissions', `Permissions modified for staff ID: ${id}`, 'System');
    return await db.getStaff();
  },

  updateStaffStatus: async (id: string, status: Staff['status']): Promise<Staff[]> => {
    const oldStaff = localCache.staff[id];
    if (oldStaff) {
      await queueMutation('staff', 'set', id, { ...oldStaff, status });
    }
    await db.logActivity('staff', 'Updated Staff Status', `Staff status changed to ${status} for ID: ${id}`, 'System');
    return await db.getStaff();
  },

  addStaff: async (staff: Omit<Staff, 'id' | 'createdAt'>): Promise<Staff> => {
    const id = `staff-${Date.now()}`;
    const newStaff: Staff = {
      ...staff,
      id,
      createdAt: new Date().toISOString()
    };
    await queueMutation('staff', 'set', id, newStaff);
    await db.logActivity('staff', 'Added New Staff', `Staff member ${staff.name} (${staff.email}) created`, 'System');
    return newStaff;
  },

  deleteStaff: async (id: string): Promise<void> => {
    await queueMutation('staff', 'remove', id);
    await db.logActivity('staff', 'Removed Staff', `Staff member ID ${id} deleted`, 'System');
  },

  // Customer Enquiry Module
  getEnquiries: async (includeDeleted: boolean = false): Promise<Enquiry[]> => {
    const list = Object.values(localCache.enquiries);
    if (includeDeleted) {
      return list;
    }
    return list.filter(e => !e.isDeleted);
  },

  addEnquiry: async (enquiry: Omit<Enquiry, 'id' | 'createdAt'>): Promise<Enquiry> => {
    const id = `enq-${Date.now()}`;
    const newEnq: Enquiry = {
      ...enquiry,
      id,
      createdAt: new Date().toISOString()
    };
    await queueMutation('enquiries', 'set', id, newEnq);

    // Auto-create a pending follow-up if follow-up date is set
    if (enquiry.followUpDate) {
      await db.addFollowUp({
        enquiryId: id,
        customerName: newEnq.customerName,
        scheduledDate: newEnq.followUpDate,
        type: 'Call',
        status: 'Pending'
      }, newEnq.createdBy);
    }

    await db.logActivity('enquiry', 'Created Enquiry', `Enquiry raised for ${newEnq.customerName} - ${newEnq.brand} ${newEnq.product}`, newEnq.createdBy);
    return newEnq;
  },

  updateEnquiry: async (id: string, enquiry: Partial<Enquiry>, userEmail: string = 'System'): Promise<Enquiry> => {
    const oldEnq = localCache.enquiries[id];
    if (!oldEnq) throw new Error('Enquiry not found');

    const updatedEnq = { ...oldEnq, ...enquiry };
    await queueMutation('enquiries', 'set', id, updatedEnq);

    if (enquiry.status === 'Converted' && oldEnq.status !== 'Converted') {
      await db.logActivity('enquiry', 'Enquiry Converted', `${updatedEnq.customerName} purchase finalized: ${updatedEnq.brand} ${updatedEnq.product}`, userEmail);
    } else {
      await db.logActivity('enquiry', 'Modified Enquiry', `Enquiry details updated for ${updatedEnq.customerName}`, userEmail);
    }

    if (enquiry.followUpDate && enquiry.followUpDate !== oldEnq.followUpDate) {
      await db.addFollowUp({
        enquiryId: id,
        customerName: updatedEnq.customerName,
        scheduledDate: enquiry.followUpDate,
        type: 'Call',
        status: 'Pending'
      }, userEmail);
    }

    return updatedEnq;
  },

  deleteEnquiry: async (id: string, userEmail: string = 'System'): Promise<void> => {
    const item = localCache.enquiries[id];
    if (item) {
      const updatedItem = {
        ...item,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: userEmail
      };
      await queueMutation('enquiries', 'set', id, updatedItem);
      await db.logActivity('enquiry', 'Soft Deleted Enquiry', `Moved enquiry ID ${id} (Customer: ${item.customerName}) to Recycle Bin`, userEmail);
    }
  },

  restoreEnquiry: async (id: string, userEmail: string = 'System'): Promise<void> => {
    const item = localCache.enquiries[id];
    if (item) {
      const updatedItem = { ...item };
      delete updatedItem.isDeleted;
      delete updatedItem.deletedAt;
      delete updatedItem.deletedBy;
      
      await queueMutation('enquiries', 'set', id, updatedItem);
      await db.logActivity('enquiry', 'Restored Enquiry', `Restored enquiry ID ${id} (Customer: ${item.customerName}) from Recycle Bin`, userEmail);
    }
  },

  permanentlyDeleteEnquiry: async (id: string, userEmail: string = 'System'): Promise<void> => {
    const item = localCache.enquiries[id] || null;

    await queueMutation('enquiries', 'remove', id);

    // Cascade delete local sub-records offline
    const srvs = Object.values(localCache.services);
    for (const s of srvs) {
      if (s.enquiryId === id) {
        await queueMutation('services', 'remove', s.id);
      }
    }

    const dms = Object.values(localCache.demos);
    for (const d of dms) {
      if (d.enquiryId === id) {
        await queueMutation('demos', 'remove', d.id);
      }
    }

    const fups = Object.values(localCache.followups);
    for (const f of fups) {
      if (f.enquiryId === id) {
        await queueMutation('followups', 'remove', f.id);
      }
    }

    const insts = Object.values(localCache.installations);
    for (const inst of insts) {
      if (inst.enquiryId === id) {
        await queueMutation('installations', 'remove', inst.id);
      }
    }

    await db.logActivity('enquiry', 'Permanently Deleted Enquiry', `Permanently purged enquiry ID ${id} and all sub-records for customer ${item?.customerName || 'Unknown'}`, userEmail);
  },

  // Service Module
  getServices: async (): Promise<ServiceLog[]> => {
    return Object.values(localCache.services);
  },

  addService: async (service: Omit<ServiceLog, 'id' | 'loggedAt'>, userEmail: string = 'System'): Promise<ServiceLog> => {
    const id = `srv-${Date.now()}`;
    const newSrv: ServiceLog = {
      ...service,
      id,
      loggedAt: new Date().toISOString()
    };
    await queueMutation('services', 'set', id, newSrv);
    await db.updateEnquiryStatusFromSubmodule(service.enquiryId, 'Service Logged', userEmail);
    await db.logActivity('service', 'Service Job Logged', `Logged service issue for ${service.customerName} - ${service.product}`, userEmail);
    return newSrv;
  },

  updateService: async (id: string, service: Partial<ServiceLog>, userEmail: string = 'System'): Promise<ServiceLog> => {
    const oldSrv = localCache.services[id];
    if (!oldSrv) throw new Error('Service log not found');

    const resolvedAt = service.status === 'Completed' ? new Date().toISOString() : (oldSrv.resolvedAt || null);
    const updatedSrv = { 
      ...oldSrv, 
      ...service,
      resolvedAt
    };
    await queueMutation('services', 'set', id, updatedSrv);
    await db.logActivity('service', 'Updated Service Log', `Service ID ${id} status set to ${updatedSrv.status}`, userEmail);
    return updatedSrv;
  },

  deleteService: async (id: string, userEmail: string = 'System'): Promise<void> => {
    await queueMutation('services', 'remove', id);
    await db.logActivity('service', 'Deleted Service Job', `Service Job ID ${id} deleted`, userEmail);
  },

  // Demo Module
  getDemos: async (): Promise<DemoLog[]> => {
    return Object.values(localCache.demos);
  },

  addDemo: async (demo: Omit<DemoLog, 'id'>, userEmail: string = 'System'): Promise<DemoLog> => {
    const id = `demo-${Date.now()}`;
    const newDemo: DemoLog = {
      ...demo,
      id
    };
    await queueMutation('demos', 'set', id, newDemo);
    await db.updateEnquiryStatusFromSubmodule(demo.enquiryId, 'Demo Scheduled', userEmail);
    await db.logActivity('demo', 'Demo Scheduled', `Demo scheduled for ${demo.customerName} on ${demo.scheduledDate}`, userEmail);
    return newDemo;
  },

  updateDemo: async (id: string, demo: Partial<DemoLog>, userEmail: string = 'System'): Promise<DemoLog> => {
    const oldDemo = localCache.demos[id];
    if (!oldDemo) throw new Error('Demo not found');

    const updatedDemo = { ...oldDemo, ...demo };
    await queueMutation('demos', 'set', id, updatedDemo);
    await db.logActivity('demo', 'Updated Demo Status', `Demo ID ${id} status updated to ${updatedDemo.status}`, userEmail);
    return updatedDemo;
  },

  deleteDemo: async (id: string, userEmail: string = 'System'): Promise<void> => {
    await queueMutation('demos', 'remove', id);
    await db.logActivity('demo', 'Deleted Demo Log', `Deleted scheduled demo ID ${id}`, userEmail);
  },

  // Follow-up Module
  getFollowUps: async (): Promise<FollowUpLog[]> => {
    return Object.values(localCache.followups);
  },

  addFollowUp: async (fup: Omit<FollowUpLog, 'id'>, userEmail: string = 'System'): Promise<FollowUpLog> => {
    const id = `fup-${Date.now()}`;
    const newFup: FollowUpLog = {
      ...fup,
      id
    };
    await queueMutation('followups', 'set', id, newFup);
    return newFup;
  },

  updateFollowUp: async (id: string, fup: Partial<FollowUpLog>, userEmail: string = 'System'): Promise<FollowUpLog> => {
    const oldFup = localCache.followups[id];
    if (!oldFup) throw new Error('Follow-up not found');

    const completedAt = fup.status === 'Completed' ? new Date().toISOString() : (oldFup.completedAt || null);
    const updatedFup = { 
      ...oldFup, 
      ...fup,
      completedAt
    };
    await queueMutation('followups', 'set', id, updatedFup);

    if (fup.status === 'Completed' && oldFup.status !== 'Completed') {
      await db.logActivity('followup', 'Follow-up Call Completed', `Follow-up call with ${updatedFup.customerName} finished: ${fup.outcome || 'No outcome entered'}`, userEmail);
    }
    return updatedFup;
  },

  deleteFollowUp: async (id: string, userEmail: string = 'System'): Promise<void> => {
    const item = localCache.followups[id] || null;
    await queueMutation('followups', 'remove', id);
    if (item) {
      await db.logActivity('followup', 'Deleted Follow-up', `Deleted scheduled follow-up call task for customer ${item.customerName}`, userEmail);
    }
  },

  // Recent Activities
  getActivities: async (): Promise<ActivityLog[]> => {
    const list = Object.values(localCache.activities);
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list.slice(0, 50);
  },

  logActivity: async (
    type: ActivityLog['type'], 
    action: string, 
    details: string, 
    user: string
  ): Promise<ActivityLog> => {
    const id = `act-${Date.now()}`;
    const newLog: ActivityLog = {
      id,
      timestamp: new Date().toISOString(),
      type,
      action,
      details,
      user
    };
    await queueMutation('activities', 'set', id, newLog);
    return newLog;
  },

  // Dashboard Stats calculation
  getDashboardStats: async (): Promise<CRMDashboardStats> => {
    const enquiries = await db.getEnquiries();
    const services = await db.getServices();
    const demos = await db.getDemos();
    const followups = await db.getFollowUps();
    const installations = await db.getInstallations();

    const todayStr = new Date().toISOString().split('T')[0];

    const totalEnquiries = enquiries.length;
    const todayEnquiries = enquiries.filter(e => e.createdAt && e.createdAt.startsWith(todayStr)).length;
    const pendingFollowups = followups.filter(f => f.status === 'Pending' && f.scheduledDate <= todayStr).length;
    const servicesCount = services.filter(s => s.status !== 'Completed' && s.status !== 'Cancelled').length;
    const demosCount = demos.filter(d => d.status === 'Scheduled').length;
    const installationsCount = installations.filter(i => i.status !== 'Completed' && i.status !== 'Cancelled').length;
    const salesCount = enquiries.filter(e => e.status === 'Converted').length;

    const converted = enquiries.filter(e => e.status === 'Converted').length;
    const nonOpen = enquiries.filter(e => e.status === 'Converted' || e.status === 'Closed' || e.status === 'Cold').length;
    const conversionRate = nonOpen > 0 ? Math.round((converted / nonOpen) * 100) : 0;

    return {
      totalEnquiries,
      todayEnquiries,
      pendingFollowups,
      servicesCount,
      demosCount,
      installationsCount,
      salesCount,
      conversionRate
    };
  },

  updateEnquiryStatusFromSubmodule: async (enquiryId: string, status: EnquiryStatus, userEmail: string) => {
    try {
      const oldEnq = localCache.enquiries[enquiryId];
      if (oldEnq) {
        await queueMutation('enquiries', 'set', enquiryId, { ...oldEnq, status });
      }
    } catch (e) {
      console.warn('Could not update parent enquiry status:', e);
    }
  },

  // Demo Installation
  getInstallations: async (): Promise<DemoInstallation[]> => {
    return Object.values(localCache.installations);
  },

  addInstallation: async (inst: Omit<DemoInstallation, 'id' | 'createdAt'>): Promise<DemoInstallation> => {
    const id = `inst-${Date.now()}`;
    const newInst: DemoInstallation = {
      ...inst,
      id,
      createdAt: new Date().toISOString()
    };
    await queueMutation('installations', 'set', id, newInst);
    await db.logActivity('demo', 'Added Demo Installation Log', `Logged installation task for customer ${inst.customerName}`, 'System');
    return newInst;
  },

  updateInstallation: async (id: string, updates: Partial<Omit<DemoInstallation, 'id' | 'createdAt'>>, userEmail: string = 'System'): Promise<DemoInstallation> => {
    const oldInst = localCache.installations[id];
    if (!oldInst) throw new Error('Installation record not found');

    const updated = { ...oldInst, ...updates };
    await queueMutation('installations', 'set', id, updated);
    await db.logActivity('demo', 'Updated Demo Installation Status', `Updated status or attachment for ${updated.customerName} installation`, userEmail);
    return updated;
  },

  deleteInstallation: async (id: string, userEmail: string = 'System'): Promise<void> => {
    const found = localCache.installations[id] || null;
    await queueMutation('installations', 'remove', id);
    if (found) {
      await db.logActivity('demo', 'Deleted Demo Installation Log', `Removed installation log of ${found.customerName}`, userEmail);
    }
  },

  // Reset helper
  resetDatabaseToDefault: async () => {
    const collections: (keyof typeof localCache)[] = ['enquiries', 'services', 'demos', 'followups', 'installations', 'activities', 'categories', 'staff'];
    
    collections.forEach(col => {
      localCache[col] = {};
      saveLocalCache(col);
    });

    INITIAL_STAFF.forEach(s => {
      localCache.staff[s.id] = s;
    });
    saveLocalCache('staff');

    INITIAL_CATEGORIES.forEach(c => {
      localCache.categories[c.id] = c;
    });
    saveLocalCache('categories');

    collections.forEach(col => {
      triggerTableCallbacks(col);
    });

    pendingQueue = [];
    savePendingQueue();
    notifyStatusSubscribers();

    if (isOnline) {
      const updates: any = {};
      collections.forEach(col => {
        updates[col] = null;
      });
      await update(ref(database), updates);

      const staffUpdates: any = {};
      INITIAL_STAFF.forEach(s => {
        staffUpdates[s.id] = s;
      });
      await update(ref(database, 'staff'), staffUpdates);

      const catUpdates: any = {};
      INITIAL_CATEGORIES.forEach(c => {
        catUpdates[c.id] = c;
      });
      await update(ref(database, 'categories'), catUpdates);
    }
  },

  // Export / Import
  exportDataJSON: async (): Promise<string> => {
    const enquiries = await db.getEnquiries();
    const services = await db.getServices();
    const demos = await db.getDemos();
    const followups = await db.getFollowUps();
    const staff = await db.getStaff();
    const activities = await db.getActivities();
    const installations = await db.getInstallations();
    const categories = await db.getCategories();

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      enquiries,
      services,
      demos,
      followups,
      staff,
      activities,
      installations,
      categories
    }, null, 2);
  },

  importDataJSON: async (jsonString: string): Promise<boolean> => {
    try {
      const data = JSON.parse(jsonString);
      const collections: (keyof typeof localCache)[] = ['enquiries', 'services', 'demos', 'followups', 'installations', 'activities', 'categories', 'staff'];
      
      collections.forEach(col => {
        localCache[col] = {};
        if (data[col] && Array.isArray(data[col])) {
          data[col].forEach((item: any) => {
            localCache[col][item.id] = item;
          });
        }
        saveLocalCache(col);
        triggerTableCallbacks(col);
      });

      pendingQueue = [];
      savePendingQueue();
      notifyStatusSubscribers();

      if (isOnline) {
        const updates: any = {};
        collections.forEach(col => {
          updates[col] = null;
        });
        await update(ref(database), updates);

        const newUpdates: any = {};
        collections.forEach(col => {
          if (data[col] && Array.isArray(data[col])) {
            const colObj: any = {};
            data[col].forEach((item: any) => {
              colObj[item.id] = item;
            });
            newUpdates[col] = colObj;
          }
        });
        await update(ref(database), newUpdates);
      }
      return true;
    } catch (e) {
      console.error('Failed importing CRM backup JSON:', e);
      return false;
    }
  },

  // Categories Module
  getCategories: async (): Promise<Category[]> => {
    return Object.values(localCache.categories).sort((a, b) => a.name.localeCompare(b.name));
  },

  addCategory: async (name: string, userEmail: string = 'System'): Promise<Category> => {
    const id = `cat-${Date.now()}`;
    const newCat: Category = {
      id,
      name: name.trim(),
      createdAt: new Date().toISOString()
    };
    await queueMutation('categories', 'set', id, newCat);
    await db.logActivity('system', 'Added Category', `Added product category: ${name}`, userEmail);
    return newCat;
  },

  updateCategory: async (id: string, name: string, userEmail: string = 'System'): Promise<Category[]> => {
    await queueMutation('categories', 'set', id, { name: name.trim() });
    await db.logActivity('system', 'Updated Category', `Updated category ID ${id} to: ${name}`, userEmail);
    return await db.getCategories();
  },

  deleteCategory: async (id: string, userEmail: string = 'System'): Promise<void> => {
    const item = localCache.categories[id] || null;
    await queueMutation('categories', 'remove', id);
    await db.logActivity('system', 'Deleted Category', `Removed product category: ${item?.name || id}`, userEmail);
  }
};
