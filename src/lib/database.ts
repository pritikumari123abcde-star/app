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
export const database = getDatabase(app, config.databaseURL || `https://${config.projectId}-default-rtdb.firebaseio.com`);

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

export const db = {
  // Real-time Database subscriptions for instant front-end updates
  subscribeToEnquiries: (callback: (data: Enquiry[]) => void) => {
    return onValue(ref(database, 'enquiries'), (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        callback([]);
        return;
      }
      const data = Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as Enquiry[];
      callback(data);
    });
  },

  subscribeToServices: (callback: (data: ServiceLog[]) => void) => {
    return onValue(ref(database, 'services'), (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        callback([]);
        return;
      }
      const data = Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as ServiceLog[];
      callback(data);
    });
  },

  subscribeToDemos: (callback: (data: DemoLog[]) => void) => {
    return onValue(ref(database, 'demos'), (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        callback([]);
        return;
      }
      const data = Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as DemoLog[];
      callback(data);
    });
  },

  subscribeToFollowUps: (callback: (data: FollowUpLog[]) => void) => {
    return onValue(ref(database, 'followups'), (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        callback([]);
        return;
      }
      const data = Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as FollowUpLog[];
      callback(data);
    });
  },

  subscribeToInstallations: (callback: (data: DemoInstallation[]) => void) => {
    return onValue(ref(database, 'installations'), (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        callback([]);
        return;
      }
      const data = Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as DemoInstallation[];
      callback(data);
    });
  },

  subscribeToActivities: (callback: (data: ActivityLog[]) => void) => {
    return onValue(ref(database, 'activities'), (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        callback([]);
        return;
      }
      const data = Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as ActivityLog[];
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(data);
    });
  },

  subscribeToCategories: (callback: (data: Category[]) => void) => {
    return onValue(ref(database, 'categories'), async (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        // Seed default categories
        const updates: any = {};
        INITIAL_CATEGORIES.forEach(c => {
          updates[c.id] = c;
        });
        await update(ref(database, 'categories'), updates);
      } else {
        const data = Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as Category[];
        data.sort((a, b) => a.name.localeCompare(b.name));
        callback(data);
      }
    });
  },

  subscribeToStaff: (callback: (data: Staff[]) => void) => {
    return onValue(ref(database, 'staff'), async (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        // Seed default staff
        const updates: any = {};
        INITIAL_STAFF.forEach(s => {
          updates[s.id] = s;
        });
        await update(ref(database, 'staff'), updates);
      } else {
        const data = Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as Staff[];
        callback(data);
      }
    });
  },

  // Staff and Permissions
  getStaff: async (): Promise<Staff[]> => {
    const snapshot = await get(ref(database, 'staff'));
    const val = snapshot.val();
    if (!val) {
      const updates: any = {};
      INITIAL_STAFF.forEach(s => {
        updates[s.id] = s;
      });
      await update(ref(database, 'staff'), updates);
      return INITIAL_STAFF;
    }
    return Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as Staff[];
  },

  updateStaffPermissions: async (id: string, permissions: Staff['permissions']): Promise<Staff[]> => {
    await update(ref(database, `staff/${id}`), { permissions });
    await db.logActivity('staff', 'Updated Staff Permissions', `Permissions modified for staff ID: ${id}`, 'System');
    return await db.getStaff();
  },

  updateStaffStatus: async (id: string, status: Staff['status']): Promise<Staff[]> => {
    await update(ref(database, `staff/${id}`), { status });
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
    await set(ref(database, `staff/${id}`), newStaff);
    await db.logActivity('staff', 'Added New Staff', `Staff member ${staff.name} (${staff.email}) created`, 'System');
    return newStaff;
  },

  deleteStaff: async (id: string): Promise<void> => {
    await remove(ref(database, `staff/${id}`));
    await db.logActivity('staff', 'Removed Staff', `Staff member ID ${id} deleted`, 'System');
  },

  // Customer Enquiry Module
  getEnquiries: async (includeDeleted: boolean = false): Promise<Enquiry[]> => {
    const snapshot = await get(ref(database, 'enquiries'));
    const val = snapshot.val();
    if (!val) return [];
    const list = Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as Enquiry[];
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
    await set(ref(database, `enquiries/${id}`), newEnq);

    // Auto-create a pending follow-up if follow-up date is set
    if (enquiry.followUpDate) {
      await db.addFollowUp({
        enquiryId: id,
        customerName: newEnq.customerName,
        scheduledDate: newEnq.followUpDate,
        type: 'Call',
        status: 'Pending'
      });
    }

    await db.logActivity('enquiry', 'Created Enquiry', `Enquiry raised for ${newEnq.customerName} - ${newEnq.brand} ${newEnq.product}`, newEnq.createdBy);
    return newEnq;
  },

  updateEnquiry: async (id: string, enquiry: Partial<Enquiry>, userEmail: string = 'System'): Promise<Enquiry> => {
    const refPath = ref(database, `enquiries/${id}`);
    const snapshot = await get(refPath);
    if (!snapshot.exists()) throw new Error('Enquiry not found');
    const oldEnq = snapshot.val() as Enquiry;

    const updatedEnq = { ...oldEnq, ...enquiry };
    await set(refPath, updatedEnq);

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
      });
    }

    return updatedEnq;
  },

  deleteEnquiry: async (id: string, userEmail: string = 'System'): Promise<void> => {
    const refPath = ref(database, `enquiries/${id}`);
    const snapshot = await get(refPath);
    if (snapshot.exists()) {
      const item = snapshot.val() as Enquiry;
      const updatedItem = {
        ...item,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: userEmail
      };
      await set(refPath, updatedItem);
      await db.logActivity('enquiry', 'Soft Deleted Enquiry', `Moved enquiry ID ${id} (Customer: ${item.customerName}) to Recycle Bin`, userEmail);
    }
  },

  restoreEnquiry: async (id: string, userEmail: string = 'System'): Promise<void> => {
    const refPath = ref(database, `enquiries/${id}`);
    const snapshot = await get(refPath);
    if (snapshot.exists()) {
      const item = snapshot.val() as Enquiry;
      const updatedItem = { ...item };
      delete updatedItem.isDeleted;
      delete updatedItem.deletedAt;
      delete updatedItem.deletedBy;
      
      await set(refPath, updatedItem);
      await db.logActivity('enquiry', 'Restored Enquiry', `Restored enquiry ID ${id} (Customer: ${item.customerName}) from Recycle Bin`, userEmail);
    }
  },

  permanentlyDeleteEnquiry: async (id: string, userEmail: string = 'System'): Promise<void> => {
    const refPath = ref(database, `enquiries/${id}`);
    const snapshot = await get(refPath);
    const item = snapshot.exists() ? snapshot.val() as Enquiry : null;

    await remove(refPath);

    // Delete associated items
    const srvsSnap = await get(ref(database, 'services'));
    if (srvsSnap.exists()) {
      const srvs = srvsSnap.val();
      for (const [sid, s] of Object.entries(srvs)) {
        if ((s as any).enquiryId === id) {
          await remove(ref(database, `services/${sid}`));
        }
      }
    }

    const dmsSnap = await get(ref(database, 'demos'));
    if (dmsSnap.exists()) {
      const dms = dmsSnap.val();
      for (const [did, d] of Object.entries(dms)) {
        if ((d as any).enquiryId === id) {
          await remove(ref(database, `demos/${did}`));
        }
      }
    }

    const fupsSnap = await get(ref(database, 'followups'));
    if (fupsSnap.exists()) {
      const fups = fupsSnap.val();
      for (const [fid, f] of Object.entries(fups)) {
        if ((f as any).enquiryId === id) {
          await remove(ref(database, `followups/${fid}`));
        }
      }
    }

    const instsSnap = await get(ref(database, 'installations'));
    if (instsSnap.exists()) {
      const insts = instsSnap.val();
      for (const [iid, inst] of Object.entries(insts)) {
        if ((inst as any).enquiryId === id) {
          await remove(ref(database, `installations/${iid}`));
        }
      }
    }

    await db.logActivity('enquiry', 'Permanently Deleted Enquiry', `Permanently purged enquiry ID ${id} and all sub-records for customer ${item?.customerName || 'Unknown'}`, userEmail);
  },

  // Service Module
  getServices: async (): Promise<ServiceLog[]> => {
    const snapshot = await get(ref(database, 'services'));
    const val = snapshot.val();
    if (!val) return [];
    return Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as ServiceLog[];
  },

  addService: async (service: Omit<ServiceLog, 'id' | 'loggedAt'>, userEmail: string = 'System'): Promise<ServiceLog> => {
    const id = `srv-${Date.now()}`;
    const newSrv: ServiceLog = {
      ...service,
      id,
      loggedAt: new Date().toISOString()
    };
    await set(ref(database, `services/${id}`), newSrv);
    await db.updateEnquiryStatusFromSubmodule(service.enquiryId, 'Service Logged', userEmail);
    await db.logActivity('service', 'Service Job Logged', `Logged service issue for ${service.customerName} - ${service.product}`, userEmail);
    return newSrv;
  },

  updateService: async (id: string, service: Partial<ServiceLog>, userEmail: string = 'System'): Promise<ServiceLog> => {
    const refPath = ref(database, `services/${id}`);
    const snapshot = await get(refPath);
    if (!snapshot.exists()) throw new Error('Service log not found');
    const oldSrv = snapshot.val() as ServiceLog;

    const resolvedAt = service.status === 'Completed' ? new Date().toISOString() : (oldSrv.resolvedAt || null);
    const updatedSrv = { 
      ...oldSrv, 
      ...service,
      resolvedAt
    };
    await set(refPath, updatedSrv);
    await db.logActivity('service', 'Updated Service Log', `Service ID ${id} status set to ${updatedSrv.status}`, userEmail);
    return updatedSrv;
  },

  deleteService: async (id: string, userEmail: string = 'System'): Promise<void> => {
    await remove(ref(database, `services/${id}`));
    await db.logActivity('service', 'Deleted Service Job', `Service Job ID ${id} deleted`, userEmail);
  },

  // Demo Module
  getDemos: async (): Promise<DemoLog[]> => {
    const snapshot = await get(ref(database, 'demos'));
    const val = snapshot.val();
    if (!val) return [];
    return Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as DemoLog[];
  },

  addDemo: async (demo: Omit<DemoLog, 'id'>, userEmail: string = 'System'): Promise<DemoLog> => {
    const id = `demo-${Date.now()}`;
    const newDemo: DemoLog = {
      ...demo,
      id
    };
    await set(ref(database, `demos/${id}`), newDemo);
    await db.updateEnquiryStatusFromSubmodule(demo.enquiryId, 'Demo Scheduled', userEmail);
    await db.logActivity('demo', 'Demo Scheduled', `Demo scheduled for ${demo.customerName} on ${demo.scheduledDate}`, userEmail);
    return newDemo;
  },

  updateDemo: async (id: string, demo: Partial<DemoLog>, userEmail: string = 'System'): Promise<DemoLog> => {
    const refPath = ref(database, `demos/${id}`);
    const snapshot = await get(refPath);
    if (!snapshot.exists()) throw new Error('Demo not found');
    const oldDemo = snapshot.val() as DemoLog;

    const updatedDemo = { ...oldDemo, ...demo };
    await set(refPath, updatedDemo);
    await db.logActivity('demo', 'Updated Demo Status', `Demo ID ${id} status updated to ${updatedDemo.status}`, userEmail);
    return updatedDemo;
  },

  deleteDemo: async (id: string, userEmail: string = 'System'): Promise<void> => {
    await remove(ref(database, `demos/${id}`));
    await db.logActivity('demo', 'Deleted Demo Log', `Deleted scheduled demo ID ${id}`, userEmail);
  },

  // Follow-up Module
  getFollowUps: async (): Promise<FollowUpLog[]> => {
    const snapshot = await get(ref(database, 'followups'));
    const val = snapshot.val();
    if (!val) return [];
    return Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as FollowUpLog[];
  },

  addFollowUp: async (fup: Omit<FollowUpLog, 'id'>, userEmail: string = 'System'): Promise<FollowUpLog> => {
    const id = `fup-${Date.now()}`;
    const newFup: FollowUpLog = {
      ...fup,
      id
    };
    await set(ref(database, `followups/${id}`), newFup);
    return newFup;
  },

  updateFollowUp: async (id: string, fup: Partial<FollowUpLog>, userEmail: string = 'System'): Promise<FollowUpLog> => {
    const refPath = ref(database, `followups/${id}`);
    const snapshot = await get(refPath);
    if (!snapshot.exists()) throw new Error('Follow-up not found');
    const oldFup = snapshot.val() as FollowUpLog;

    const completedAt = fup.status === 'Completed' ? new Date().toISOString() : (oldFup.completedAt || null);
    const updatedFup = { 
      ...oldFup, 
      ...fup,
      completedAt
    };
    await set(refPath, updatedFup);

    if (fup.status === 'Completed' && oldFup.status !== 'Completed') {
      await db.logActivity('followup', 'Follow-up Call Completed', `Follow-up call with ${updatedFup.customerName} finished: ${fup.outcome || 'No outcome entered'}`, userEmail);
    }
    return updatedFup;
  },

  deleteFollowUp: async (id: string, userEmail: string = 'System'): Promise<void> => {
    await remove(ref(database, `followups/${id}`));
  },

  // Recent Activities
  getActivities: async (): Promise<ActivityLog[]> => {
    const snapshot = await get(ref(database, 'activities'));
    const val = snapshot.val();
    if (!val) return [];
    const list = Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as ActivityLog[];
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
    await set(ref(database, `activities/${id}`), newLog);
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
      const refPath = ref(database, `enquiries/${enquiryId}`);
      const snapshot = await get(refPath);
      if (snapshot.exists()) {
        await update(refPath, { status });
      }
    } catch (e) {
      console.warn('Could not update parent enquiry status:', e);
    }
  },

  // Demo Installation
  getInstallations: async (): Promise<DemoInstallation[]> => {
    const snapshot = await get(ref(database, 'installations'));
    const val = snapshot.val();
    if (!val) return [];
    return Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as DemoInstallation[];
  },

  addInstallation: async (inst: Omit<DemoInstallation, 'id' | 'createdAt'>): Promise<DemoInstallation> => {
    const id = `inst-${Date.now()}`;
    const newInst: DemoInstallation = {
      ...inst,
      id,
      createdAt: new Date().toISOString()
    };
    await set(ref(database, `installations/${id}`), newInst);
    await db.logActivity('demo', 'Added Demo Installation Log', `Logged installation task for customer ${inst.customerName}`, 'System');
    return newInst;
  },

  updateInstallation: async (id: string, updates: Partial<Omit<DemoInstallation, 'id' | 'createdAt'>>, userEmail: string = 'System'): Promise<DemoInstallation> => {
    const refPath = ref(database, `installations/${id}`);
    const snapshot = await get(refPath);
    if (!snapshot.exists()) throw new Error('Installation record not found');
    const oldInst = snapshot.val() as DemoInstallation;

    const updated = { ...oldInst, ...updates };
    await set(refPath, updated);
    await db.logActivity('demo', 'Updated Demo Installation Status', `Updated status or attachment for ${updated.customerName} installation`, userEmail);
    return updated;
  },

  deleteInstallation: async (id: string, userEmail: string = 'System'): Promise<void> => {
    const refPath = ref(database, `installations/${id}`);
    const snapshot = await get(refPath);
    const found = snapshot.exists() ? snapshot.val() as DemoInstallation : null;
    await remove(refPath);
    if (found) {
      await db.logActivity('demo', 'Deleted Demo Installation Log', `Removed installation log of ${found.customerName}`, userEmail);
    }
  },

  // Reset helper
  resetDatabaseToDefault: async () => {
    const collections = ['enquiries', 'services', 'demos', 'followups', 'installations', 'activities', 'categories', 'staff'];
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
      const collections = ['enquiries', 'services', 'demos', 'followups', 'installations', 'activities', 'categories', 'staff'];
      
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
      return true;
    } catch (e) {
      console.error('Failed importing CRM backup JSON:', e);
      return false;
    }
  },

  // Categories Module
  getCategories: async (): Promise<Category[]> => {
    const snapshot = await get(ref(database, 'categories'));
    const val = snapshot.val();
    if (!val) {
      const updates: any = {};
      INITIAL_CATEGORIES.forEach(cat => {
        updates[cat.id] = cat;
      });
      await update(ref(database, 'categories'), updates);
      return INITIAL_CATEGORIES;
    }
    const categories = Object.entries(val).map(([id, item]: [string, any]) => ({ id, ...item })) as Category[];
    return categories.sort((a, b) => a.name.localeCompare(b.name));
  },

  addCategory: async (name: string, userEmail: string = 'System'): Promise<Category> => {
    const id = `cat-${Date.now()}`;
    const newCat: Category = {
      id,
      name: name.trim(),
      createdAt: new Date().toISOString()
    };
    await set(ref(database, `categories/${id}`), newCat);
    await db.logActivity('system', 'Added Category', `Added product category: ${name}`, userEmail);
    return newCat;
  },

  updateCategory: async (id: string, name: string, userEmail: string = 'System'): Promise<Category[]> => {
    await update(ref(database, `categories/${id}`), { name: name.trim() });
    await db.logActivity('system', 'Updated Category', `Updated category ID ${id} to: ${name}`, userEmail);
    return await db.getCategories();
  },

  deleteCategory: async (id: string, userEmail: string = 'System'): Promise<void> => {
    const refPath = ref(database, `categories/${id}`);
    const snapshot = await get(refPath);
    const item = snapshot.exists() ? snapshot.val() as Category : null;
    await remove(refPath);
    await db.logActivity('system', 'Deleted Category', `Removed product category: ${item?.name || id}`, userEmail);
  }
};
