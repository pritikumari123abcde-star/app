export interface StaffPermissions {
  canAddEnquiry: boolean;
  canEditEnquiry: boolean;
  canDeleteEnquiry: boolean;
  canManageServices: boolean;
  canManageDemos: boolean;
  canManageFollowUps: boolean;
  canViewReports: boolean;
  canExportCSV: boolean;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Staff';
  permissions: StaffPermissions;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export type EnquiryType = 'Sales' | 'Service' | 'Demo' | 'General';
export type EnquirySource = 'Walk-in' | 'Call' | 'WhatsApp' | 'JustDial' | 'Facebook' | 'Website' | 'Other';
export type EnquiryStatus = 'New' | 'Interested' | 'Cold' | 'Hot' | 'Service Logged' | 'Demo Scheduled' | 'Converted' | 'Closed';

export interface Enquiry {
  id: string;
  customerName: string;
  mobile: string;
  altMobile?: string;
  address?: string;
  city?: string;
  pinCode?: string;
  product: string;
  brand?: string;
  model?: string;
  enquiryType: EnquiryType;
  source: EnquirySource;
  status: EnquiryStatus;
  followUpDate?: string; // YYYY-MM-DD
  remarks?: string;
  createdAt: string;
  createdBy: string;
  assignedTo?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export type ServiceStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export interface ServiceLog {
  id: string;
  enquiryId: string;
  customerName: string;
  customerMobile?: string;
  product?: string;
  issue?: string;
  technicianName?: string;
  charges?: number;
  status: ServiceStatus;
  loggedAt: string;
  resolvedAt?: string;
  imageName?: string;
  imageData?: string;
  pdfName?: string;
  pdfData?: string;
}

export type DemoStatus = 'Scheduled' | 'Completed' | 'No Show' | 'Cancelled';

export interface DemoLog {
  id: string;
  enquiryId: string;
  customerName: string;
  product: string;
  brand: string;
  model?: string;
  scheduledDate: string; // YYYY-MM-DD
  demonstratorName?: string;
  status: DemoStatus;
  feedback?: string;
}

export type FollowUpType = 'Call' | 'WhatsApp' | 'Visit' | 'Email';
export type FollowUpStatus = 'Pending' | 'Completed' | 'Missed';

export interface FollowUpLog {
  id: string;
  enquiryId: string;
  customerName: string;
  scheduledDate: string; // YYYY-MM-DD
  type: FollowUpType;
  status: FollowUpStatus;
  outcome?: string;
  completedAt?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'enquiry' | 'service' | 'demo' | 'followup' | 'staff' | 'system';
  action: string; // e.g., "Created Enquiry", "Completed Demo"
  details: string;
  user: string;
}

export interface CRMDashboardStats {
  totalEnquiries: number;
  todayEnquiries: number;
  pendingFollowups: number;
  servicesCount: number;
  demosCount: number;
  installationsCount: number;
  salesCount: number;
  conversionRate: number;
}

export type InstallationStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export interface DemoInstallation {
  id: string;
  enquiryId: string;
  customerName: string;
  customerMobile?: string;
  product?: string;
  brand?: string;
  model?: string;
  installationDate?: string; // YYYY-MM-DD
  installerName?: string;
  status: InstallationStatus;
  pdfData?: string; // Base64 data or mock PDF url
  pdfName?: string; // Original uploaded file name
  imageData?: string; // Base64 image data
  imageName?: string; // Original uploaded image name
  notes?: string;
  createdAt: string;
}

