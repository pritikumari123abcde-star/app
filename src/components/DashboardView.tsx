import React, { useMemo } from 'react';
import { 
  Enquiry, ServiceLog, DemoLog, FollowUpLog, DemoInstallation, ActivityLog 
} from '../types';
import { ClipboardList, RefreshCw } from 'lucide-react';

interface DashboardViewProps {
  onCardClick: (tab: 'enquiry' | 'service' | 'demo' | 'followup' | 'installation', filterValue?: string) => void;
  userEmail: string;
  enquiries: Enquiry[];
  services: ServiceLog[];
  demos: DemoLog[];
  followups: FollowUpLog[];
  installations: DemoInstallation[];
  activities: ActivityLog[];
  onRefresh: () => Promise<void>;
  isSyncing?: boolean;
}

export default function DashboardView({ 
  onCardClick, 
  userEmail,
  enquiries,
  services,
  demos,
  followups,
  installations,
  activities,
  onRefresh,
  isSyncing = false
}: DashboardViewProps) {

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    const totalEnquiries = enquiries.length;
    const todayEnquiries = enquiries.filter(e => e.createdAt && e.createdAt.startsWith(todayStr)).length;
    const pendingFollowups = followups.filter(f => f.status === 'Pending' && f.scheduledDate <= todayStr).length;
    const servicesCount = services.filter(s => s.status !== 'Completed' && s.status !== 'Cancelled').length;
    const demosCount = demos.filter(d => d.status === 'Scheduled').length;
    const installationsCount = installations.filter(i => i.status !== 'Completed' && i.status !== 'Cancelled').length;
    const salesCount = enquiries.filter(e => e.status === 'Converted').length;

    // Conversion rate calculation
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
  }, [enquiries, services, demos, followups, installations]);

  const recentActivities = useMemo(() => {
    return activities.slice(0, 8);
  }, [activities]);

  return (
    <div className="space-y-6 font-sans">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-950 p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 px-2.5 py-0.5 text-[10px] tracking-wider uppercase font-extrabold rounded">LIVE ENVIRONMENT</span>
            <span className="text-xs text-blue-200">Paradise Retail</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-display tracking-tight">
            Paradise Group Customer CRM
          </h2>
          <p className="text-xs text-blue-100 max-w-md">
            Electronics retail enquiry tracker, service status board, home demonstration manager, and active staff log.
          </p>
        </div>

        <div className="flex gap-2 self-stretch md:self-auto">
          <button
            onClick={() => onCardClick('enquiry')}
            className="flex-1 bg-white hover:bg-slate-50 text-blue-900 text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 border border-slate-100 cursor-pointer"
          >
            <ClipboardList className="w-3.5 h-3.5 text-blue-700" />
            <span>View Enquiries</span>
          </button>
        </div>
      </div>

      {/* Spacing & clickable stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Card 1: Total Enquiries */}
        <div
          onClick={() => onCardClick('enquiry')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center text-slate-400 mb-1">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total Enquiries</span>
              <span className="material-icons text-sm text-blue-600 bg-blue-50 p-1 rounded">assignment</span>
            </div>
            <div className="text-2xl font-black font-display text-slate-900 group-hover:text-blue-700 transition">
              {stats.totalEnquiries}
            </div>
          </div>
          <span className="text-[9px] text-blue-600 mt-2 font-semibold">Click to view table ➔</span>
        </div>

        {/* Card 2: Today's Enquiries */}
        <div
          onClick={() => onCardClick('enquiry', 'Today')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center text-slate-400 mb-1">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Today&apos;s Enquiries</span>
              <span className="material-icons text-sm text-green-600 bg-green-50 p-1 rounded">today</span>
            </div>
            <div className="text-2xl font-black font-display text-slate-900 group-hover:text-green-700 transition">
              {stats.todayEnquiries}
            </div>
          </div>
          <span className="text-[9px] text-green-600 mt-2 font-semibold">Click to filter today ➔</span>
        </div>

        {/* Card 3: Pending Follow-ups */}
        <div
          onClick={() => onCardClick('followup')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-red-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center text-slate-400 mb-1">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Pending Follows</span>
              <span className="material-icons text-sm text-red-600 bg-red-50 p-1 rounded">add_alert</span>
            </div>
            <div className="text-2xl font-black font-display text-slate-900 group-hover:text-red-600 transition">
              {stats.pendingFollowups}
            </div>
          </div>
          <span className="text-[9px] text-red-500 mt-2 font-semibold">Click to view calendar ➔</span>
        </div>

        {/* Card 4: Services */}
        <div
          onClick={() => onCardClick('service')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center text-slate-400 mb-1">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Services Active</span>
              <span className="material-icons text-sm text-orange-600 bg-orange-50 p-1 rounded">construction</span>
            </div>
            <div className="text-2xl font-black font-display text-slate-900 group-hover:text-orange-600 transition">
              {stats.servicesCount}
            </div>
          </div>
          <span className="text-[9px] text-orange-600 mt-2 font-semibold">Click to view tickets ➔</span>
        </div>

        {/* Card 5: Demo Installations */}
        <div
          onClick={() => onCardClick('installation')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-yellow-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center text-slate-400 mb-1">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Demo Installations</span>
              <span className="material-icons text-sm text-yellow-600 bg-yellow-50 p-1 rounded">plumbing</span>
            </div>
            <div className="text-2xl font-black font-display text-slate-900 group-hover:text-yellow-600 transition">
              {stats.installationsCount}
            </div>
          </div>
          <span className="text-[9px] text-yellow-600 mt-2 font-semibold">Click to view installations ➔</span>
        </div>

        {/* Card 6: Converted Sales */}
        <div
          onClick={() => onCardClick('enquiry', 'Converted')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center text-slate-400 mb-1">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Sold (Converted)</span>
              <span className="material-icons text-sm text-green-700 bg-green-100 p-1 rounded">shopping_bag</span>
            </div>
            <div className="text-2xl font-black font-display text-slate-900 group-hover:text-green-700 transition">
              {stats.salesCount}
            </div>
          </div>
          <span className="text-[9px] text-green-700 mt-2 font-semibold">Filter converted list ➔</span>
        </div>
      </div>

      {/* Main Content Splitting */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2-Span): Recent Activities / Live Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm tracking-tight font-display flex items-center gap-1.5">
                <span className="material-icons text-blue-700">insights</span>
                Live Office Operations &amp; Enquiry Audit Trail
              </h3>
              <p className="text-[11px] text-slate-400">Immediate log of staff updates and customer interest metrics.</p>
            </div>
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="text-xs text-blue-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-55"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Refreshing...' : 'Refresh Feed'}</span>
            </button>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {recentActivities.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400">
                No recent workspace operations recorded.
              </div>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="flex gap-3 text-xs border-b border-slate-50 pb-3 last:border-0 last:pb-0 animate-fade-in">
                  {/* Icon categorizer */}
                  <div className="mt-0.5">
                    {act.type === 'enquiry' && (
                      <span className="material-icons text-base text-blue-700 bg-blue-50 p-1.5 rounded-lg">assignment</span>
                    )}
                    {act.type === 'service' && (
                      <span className="material-icons text-base text-orange-600 bg-orange-50 p-1.5 rounded-lg">construction</span>
                    )}
                    {act.type === 'demo' && (
                      <span className="material-icons text-base text-yellow-600 bg-yellow-50 p-1.5 rounded-lg">play_circle</span>
                    )}
                    {act.type === 'followup' && (
                      <span className="material-icons text-base text-green-600 bg-green-50 p-1.5 rounded-lg">phone_forwarded</span>
                    )}
                    {act.type === 'staff' && (
                      <span className="material-icons text-base text-purple-600 bg-purple-50 p-1.5 rounded-lg">people_outline</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-slate-800 truncate">{act.action}</span>
                      <span className="text-[9px] text-slate-400 shrink-0">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">{act.details}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-400">
                      <span className="font-semibold text-slate-500">Actor:</span>
                      <span>{act.user}</span>
                      <span>•</span>
                      <span>{new Date(act.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (1-Span): Conversion Progress & Static Goals */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-sm tracking-tight font-display border-b border-slate-100 pb-3">
              Performance Conversion Chart
            </h3>

            {/* SVG circle chart */}
            <div className="flex flex-col items-center py-4">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-slate-100"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Progress Line */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-blue-700 transition-all duration-1000 ease-out"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - stats.conversionRate / 100)}`}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center font-sans">
                  <span className="text-2xl font-black text-slate-800 font-display">
                    {stats.conversionRate}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Closed Won
                  </span>
                </div>
              </div>
              
              <div className="text-center mt-4">
                <p className="text-xs font-semibold text-slate-700">Conversion Rate of Converted Leads</p>
                <p className="text-[11px] text-slate-400 mt-1">Goal conversion rate is 35% for this cycle.</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Staff Target Score</h4>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 h-full w-[78%]" />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-500">
              <span>Target Achieved: 78%</span>
              <span>Needs 22%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
