import React from 'react';
import { CRMNotification } from '../lib/notifications';
import { 
  Bell, CheckCheck, Trash2, Mail, ArrowLeft, 
  Clock, ExternalLink
} from 'lucide-react';

interface NotificationCenterProps {
  currentUser: { email: string; name: string };
  notifications: CRMNotification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onActionClick: (notification: CRMNotification) => void;
}

export default function NotificationCenter({
  currentUser,
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  onActionClick
}: NotificationCenterProps) {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getCategoryStyles = (category: CRMNotification['category']) => {
    switch (category) {
      case 'enquiry':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-100',
          icon: 'rate_review',
          label: 'New Lead'
        };
      case 'followup':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-100',
          icon: 'phone_forwarded',
          label: 'Follow-up'
        };
      case 'status_change':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-100',
          icon: 'sync_alt',
          label: 'Status Change'
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: 'info',
          label: 'System'
        };
    }
  };

  const getFormatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans">
      {/* Panel Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3.5 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xs font-black font-display text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-blue-700" />
              Notification Center
            </h2>
            <p className="text-[9px] text-slate-400 font-medium">
              {unreadCount} unread alerts for {currentUser.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-700 rounded-lg transition"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-rose-600 rounded-lg transition"
              title="Clear all notifications"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Notifications scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
        {notifications.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border">
              <Bell className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 font-display">Inbox is Empty</p>
              <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto mt-0.5">
                Critical updates, assigned follow-ups, and customer log changes will show up here.
              </p>
            </div>
          </div>
        ) : (
          notifications.map((n) => {
            const styles = getCategoryStyles(n.category);
            return (
              <div 
                key={n.id}
                onClick={() => !n.isRead && onMarkRead(n.id)}
                className={`p-3.5 rounded-2xl border transition relative flex flex-col gap-2 cursor-pointer ${
                  n.isRead 
                    ? 'bg-white border-slate-100 hover:border-slate-200 opacity-85' 
                    : 'bg-blue-50/70 border-blue-100 hover:border-blue-200 shadow-sm'
                }`}
              >
                {/* Unread circle badge */}
                {!n.isRead && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-blue-600 rounded-full" />
                )}

                {/* Tag & Time */}
                <div className="flex justify-between items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[8px] uppercase tracking-wider border ${styles.bg}`}>
                    {styles.label}
                  </span>
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <span>{getFormatTime(n.createdAt)}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <h4 className={`text-[11px] font-extrabold text-slate-900 leading-snug`}>
                    {n.title}
                  </h4>
                  <p className="text-[10px] text-slate-600 leading-normal">
                    {n.message}
                  </p>
                </div>

                {/* Email Delivery Badge & Navigation Link */}
                <div className="flex justify-between items-center pt-2.5 mt-0.5 border-t border-slate-100/60">
                  <div className="flex items-center gap-1">
                    {n.emailSent ? (
                      <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                        <Mail className="w-2.5 h-2.5" />
                        <span>Email Sent</span>
                      </span>
                    ) : (
                      <span className="text-[8px] text-slate-400 font-medium">In-app alert</span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRead(n.id);
                      onActionClick(n);
                    }}
                    className="flex items-center gap-1 text-[9px] font-bold text-blue-700 hover:text-blue-800 hover:underline px-2 py-1 rounded-lg hover:bg-blue-50/50 transition cursor-pointer"
                  >
                    <span>View Record</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
