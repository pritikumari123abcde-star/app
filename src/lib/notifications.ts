export interface CRMNotification {
  id: string;
  userEmail: string; // The target recipient (e.g. 'all', or a specific staff email)
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'enquiry' | 'followup' | 'status_change' | 'system';
  isRead: boolean;
  createdAt: string;
  enquiryId?: string;
  emailSent?: boolean;
}

export interface NotificationPreferences {
  inAppNewEnquiry: boolean;
  inAppAssignedFollowUp: boolean;
  inAppStatusChange: boolean;
  emailNewEnquiry: boolean;
  emailAssignedFollowUp: boolean;
  emailStatusChange: boolean;
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}

const DEFAULT_PREFS: NotificationPreferences = {
  inAppNewEnquiry: true,
  inAppAssignedFollowUp: true,
  inAppStatusChange: true,
  emailNewEnquiry: true,
  emailAssignedFollowUp: true,
  emailStatusChange: true,
};

// Helper to get preferences for a user
export function getNotificationPrefs(userEmail: string): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  const key = `crm_notif_prefs_${userEmail.toLowerCase()}`;
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(DEFAULT_PREFS));
    return DEFAULT_PREFS;
  }
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(data) };
  } catch (e) {
    return DEFAULT_PREFS;
  }
}

// Helper to save preferences for a user
export function saveNotificationPrefs(userEmail: string, prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  const key = `crm_notif_prefs_${userEmail.toLowerCase()}`;
  localStorage.setItem(key, JSON.stringify(prefs));
}

// Helper to get notifications for a specific user (and 'all' notifications)
export function getNotifications(userEmail: string): CRMNotification[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('crm_notifications');
  if (!data) return [];
  try {
    const all: CRMNotification[] = JSON.parse(data);
    const emailLower = userEmail.toLowerCase();
    // Filter for the logged-in user or broadcast to 'all' or 'admin' (if user is admin)
    return all.filter(n => 
      n.userEmail.toLowerCase() === emailLower || 
      n.userEmail.toLowerCase() === 'all'
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    return [];
  }
}

// Helper to add a notification
export function addNotification(
  notification: Omit<CRMNotification, 'id' | 'createdAt' | 'isRead'>
): CRMNotification {
  if (typeof window === 'undefined') {
    return {
      ...notification,
      id: 'notif-temp',
      isRead: false,
      createdAt: new Date().toISOString()
    };
  }
  const data = localStorage.getItem('crm_notifications');
  const list: CRMNotification[] = data ? JSON.parse(data) : [];
  
  const newNotif: CRMNotification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  
  list.unshift(newNotif);
  localStorage.setItem('crm_notifications', JSON.stringify(list));
  return newNotif;
}

// Helper to mark a notification as read
export function markNotificationAsRead(id: string): void {
  if (typeof window === 'undefined') return;
  const data = localStorage.getItem('crm_notifications');
  if (!data) return;
  try {
    let list: CRMNotification[] = JSON.parse(data);
    list = list.map(n => n.id === id ? { ...n, isRead: true } : n);
    localStorage.setItem('crm_notifications', JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
}

// Helper to mark all notifications as read for a user
export function markAllAsRead(userEmail: string): void {
  if (typeof window === 'undefined') return;
  const data = localStorage.getItem('crm_notifications');
  if (!data) return;
  try {
    let list: CRMNotification[] = JSON.parse(data);
    const emailLower = userEmail.toLowerCase();
    list = list.map(n => {
      if (n.userEmail.toLowerCase() === emailLower || n.userEmail.toLowerCase() === 'all') {
        return { ...n, isRead: true };
      }
      return n;
    });
    localStorage.setItem('crm_notifications', JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
}

// Helper to clear notifications
export function clearAllNotifications(userEmail: string): void {
  if (typeof window === 'undefined') return;
  const data = localStorage.getItem('crm_notifications');
  if (!data) return;
  try {
    const list: CRMNotification[] = JSON.parse(data);
    const emailLower = userEmail.toLowerCase();
    // Keep notifications that are NOT for this user
    const filtered = list.filter(n => 
      n.userEmail.toLowerCase() !== emailLower && 
      n.userEmail.toLowerCase() !== 'all'
    );
    localStorage.setItem('crm_notifications', JSON.stringify(filtered));
  } catch (e) {
    console.error(e);
  }
}

// Helper to get email logs
export function getEmailLogs(): EmailLog[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('crm_email_logs');
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// Helper to clear email logs
export function clearEmailLogs(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('crm_email_logs');
}

// Helper to trigger email simulation and store logs
export function sendSimulatedEmail(to: string, subject: string, bodyText: string): void {
  if (typeof window === 'undefined') return;
  const log: EmailLog = {
    id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    to,
    subject,
    body: bodyText,
    sentAt: new Date().toISOString()
  };
  
  const data = localStorage.getItem('crm_email_logs');
  const logs: EmailLog[] = data ? JSON.parse(data) : [];
  logs.unshift(log);
  localStorage.setItem('crm_email_logs', JSON.stringify(logs));
}

// Core notification event dispatcher
export function notifyEvent(event: {
  type: 'new_enquiry' | 'assigned_followup' | 'status_change';
  title: string;
  message: string;
  enquiryId?: string;
  targetEmails: string[]; // Emails of users who should receive this notification
  details?: string;
}): void {
  // Process for each target user
  event.targetEmails.forEach(email => {
    const prefs = getNotificationPrefs(email);
    
    // Check if preference matches this event type
    let inAppEnabled = false;
    let emailEnabled = false;
    
    if (event.type === 'new_enquiry') {
      inAppEnabled = prefs.inAppNewEnquiry;
      emailEnabled = prefs.emailNewEnquiry;
    } else if (event.type === 'assigned_followup') {
      inAppEnabled = prefs.inAppAssignedFollowUp;
      emailEnabled = prefs.emailAssignedFollowUp;
    } else if (event.type === 'status_change') {
      inAppEnabled = prefs.inAppStatusChange;
      emailEnabled = prefs.emailStatusChange;
    }
    
    let emailSent = false;
    
    // 1. Send Simulated Email if enabled
    if (emailEnabled) {
      const subject = `[Paradise Group CRM] Alert: ${event.title}`;
      const greeting = `Dear Paradise Staff/Admin (${email}),\n\n`;
      const footer = `\n\n---\nParadise Group Electronics Retail CRM\nAutomatic Notification Service. Please do not reply directly.`;
      const fullBody = greeting + event.message + (event.details ? `\n\nDetails:\n${event.details}` : '') + footer;
      
      sendSimulatedEmail(email, subject, fullBody);
      emailSent = true;
    }
    
    // 2. Create in-app notification if enabled
    if (inAppEnabled) {
      addNotification({
        userEmail: email,
        title: event.title,
        message: event.message,
        type: event.type === 'new_enquiry' ? 'success' : event.type === 'assigned_followup' ? 'info' : 'warning',
        category: event.type === 'new_enquiry' ? 'enquiry' : event.type === 'assigned_followup' ? 'followup' : 'status_change',
        enquiryId: event.enquiryId,
        emailSent: emailSent
      });
    }
  });
}
