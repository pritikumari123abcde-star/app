import React, { useState, useEffect } from 'react';
import { Enquiry, ServiceLog, DemoLog, FollowUpLog, ActivityLog } from '../types';
import { db } from '../lib/database';
import { Phone, MessageSquare, Calendar, User, ShoppingBag, MapPin, CheckCircle, Clock, AlertTriangle, FileText, PlusCircle, Trash2 } from 'lucide-react';

interface CustomerProfileProps {
  enquiry: Enquiry;
  onClose: () => void;
  userEmail: string;
  onQuickAction?: (enquiry: Enquiry, type: 'Call' | 'WhatsApp') => void;
}

export default function CustomerProfile({ enquiry, onClose, userEmail, onQuickAction }: CustomerProfileProps) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [services, setServices] = useState<ServiceLog[]>([]);
  const [demos, setDemos] = useState<DemoLog[]>([]);
  const [followups, setFollowups] = useState<FollowUpLog[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const [activeTab, setActiveTab] = useState<'timeline' | 'enquiries' | 'services' | 'demos' | 'followups'>('timeline');
  const [newNote, setNewNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadCustomerData = async () => {
    setIsLoading(true);
    try {
      const allEnqs = await db.getEnquiries();
      // Filter other enquiries for same mobile phone
      const customerEnqs = allEnqs.filter(e => e.mobile === enquiry.mobile);
      setEnquiries(customerEnqs);

      const enqIds = customerEnqs.map(e => e.id);

      // Load linked services
      const allSrvs = await db.getServices();
      setServices(allSrvs.filter(s => enqIds.includes(s.enquiryId)));

      // Load linked demos
      const allDemos = await db.getDemos();
      setDemos(allDemos.filter(d => enqIds.includes(d.enquiryId)));

      // Load linked followups
      const allFups = await db.getFollowUps();
      setFollowups(allFups.filter(f => enqIds.includes(f.enquiryId)));

      // Load activities
      const allActs = await db.getActivities();
      setActivities(allActs.filter(a => a.details.includes(enquiry.customerName) || a.details.includes(enquiry.id)));

    } catch (e) {
      console.error('Error loading customer profile logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [enquiry]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    await db.logActivity('enquiry', 'Added Profile Note', `Staff note added for ${enquiry.customerName}: ${newNote}`, userEmail);
    setNewNote('');
    loadCustomerData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-blue-50 text-blue-700 border border-blue-200">New Lead</span>;
      case 'Interested':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">Interested</span>;
      case 'Hot':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-red-50 text-red-700 border border-red-200">🔥 Hot Lead</span>;
      case 'Service Logged':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-orange-50 text-orange-700 border border-orange-200">Service</span>;
      case 'Demo Scheduled':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-yellow-50 text-yellow-700 border border-yellow-200">Demo Mode</span>;
      case 'Converted':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-green-50 text-green-700 border border-green-200">💰 Sold</span>;
      case 'Cold':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-100 text-slate-700 border border-slate-200">Cold Lead</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-50 text-slate-700">{status}</span>;
    }
  };

  const handleDeleteFollowUp = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this follow-up call log?')) {
      try {
        await db.deleteFollowUp(id, userEmail);
        loadCustomerData();
      } catch (err) {
        console.error('Failed to delete follow-up:', err);
      }
    }
  };

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-xl overflow-hidden font-sans">
      {/* Header Profile Section */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-950 text-white p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full text-xs"
        >
          ✕ Close
        </button>

        <div className="flex flex-col md:flex-row gap-5 items-start md:items-center">
          <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-inner border-2 border-blue-400">
            {enquiry.customerName.charAt(0)}
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold font-display">{enquiry.customerName}</h2>
              {getStatusBadge(enquiry.status)}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-blue-200 font-medium">
              <span className="flex items-center gap-1 bg-blue-900/40 border border-blue-700/30 rounded-xl px-2 py-1 select-all font-mono">
                <Phone className="w-3 h-3 text-blue-300 animate-pulse" />
                <span>{enquiry.mobile}</span>
              </span>

              {onQuickAction && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => onQuickAction(enquiry, 'Call')}
                    className="p-1 bg-blue-600/70 hover:bg-blue-600 border border-blue-500/50 text-white rounded-lg transition text-[10px] flex items-center gap-1 cursor-pointer font-bold px-2 py-0.5 shrink-0 shadow-sm"
                    title="Quick Call"
                  >
                    <Phone className="w-2.5 h-2.5" />
                    <span>Call</span>
                  </button>
                  <button
                    onClick={() => onQuickAction(enquiry, 'WhatsApp')}
                    className="p-1 bg-green-600/75 hover:bg-green-600 border border-green-500/50 text-white rounded-lg transition text-[10px] flex items-center gap-1 cursor-pointer font-bold px-2 py-0.5 shrink-0 shadow-sm"
                    title="Quick WhatsApp"
                  >
                    <MessageSquare className="w-2.5 h-2.5" />
                    <span>Chat</span>
                  </button>
                </div>
              )}

              {enquiry.altMobile && (
                <>
                  <span className="text-blue-400">|</span>
                  <span className="flex items-center gap-1 bg-blue-900/40 border border-blue-800/30 rounded-xl px-2 py-1 select-all font-mono">
                    <Phone className="w-3 h-3 text-blue-300" />
                    <span>Alt: {enquiry.altMobile}</span>
                  </span>
                  {onQuickAction && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => onQuickAction({ ...enquiry, mobile: enquiry.altMobile! }, 'Call')}
                        className="p-1 bg-blue-600/70 hover:bg-blue-600 border border-blue-500/50 text-white rounded-lg transition text-[10px] flex items-center gap-1 cursor-pointer font-bold px-2 py-0.5 shrink-0 shadow-sm"
                        title="Quick Call Alt"
                      >
                        <Phone className="w-2.5 h-2.5" />
                        <span>Call</span>
                      </button>
                      <button
                        onClick={() => onQuickAction({ ...enquiry, mobile: enquiry.altMobile! }, 'WhatsApp')}
                        className="p-1 bg-green-600/75 hover:bg-green-600 border border-green-500/50 text-white rounded-lg transition text-[10px] flex items-center gap-1 cursor-pointer font-bold px-2 py-0.5 shrink-0 shadow-sm"
                        title="Quick WhatsApp Alt"
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  )}
                </>
              )}
              {enquiry.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {enquiry.city} {enquiry.pinCode && `(${enquiry.pinCode})`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid containing details & timeline tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Left Column: Customer Summary Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Primary Contact Profile
            </h3>

            <div className="space-y-3.5 text-xs text-slate-700">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Residential Address</span>
                <span className="font-semibold block mt-0.5">{enquiry.address || 'Not Provided'}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Product Focus</span>
                  <span className="font-semibold block mt-0.5 text-blue-800">{enquiry.product}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Brand Interest</span>
                  <span className="font-semibold block mt-0.5">{enquiry.brand} {enquiry.model && `(${enquiry.model})`}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Enquiry Source</span>
                  <span className="font-semibold block mt-0.5">{enquiry.source}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Enquiry Segment</span>
                  <span className="font-semibold block mt-0.5">{enquiry.enquiryType}</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Follow-Up Date</span>
                <span className="font-semibold block mt-0.5 text-rose-600 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {enquiry.followUpDate}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Created By Staff</span>
                <span className="font-semibold block mt-0.5 italic">{enquiry.createdBy}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-slate-100 flex gap-2">
              <a
                href={`tel:${enquiry.mobile}`}
                className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded-xl text-center text-xs font-semibold border border-blue-200 transition flex items-center justify-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Now</span>
              </a>
              <a
                href={`https://wa.me/${enquiry.mobile.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-1.5 rounded-xl text-center text-xs font-semibold border border-green-200 transition flex items-center justify-center gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Quick Profile Notes (User-Authored Notes) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Internal Staff Notes
            </h3>

            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                rows={3}
                required
                placeholder="Log internal details (e.g., requested ₹2000 discount, wants call at 5 PM...)"
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <button
                type="submit"
                className="w-full bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Save CRM Note</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Columns: Interactive Tabbed Timelines & Sub-logs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Navigation Bar */}
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'timeline' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Timeline Logs
            </button>
            <button
              onClick={() => setActiveTab('enquiries')}
              className={`flex-1 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'enquiries' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Enquiries ({enquiries.length})
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-1 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'services' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Services ({services.length})
            </button>
            <button
              onClick={() => setActiveTab('demos')}
              className={`flex-1 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'demos' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Demos ({demos.length})
            </button>
            <button
              onClick={() => setActiveTab('followups')}
              className={`flex-1 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'followups' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Follow-ups ({followups.length})
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm min-h-[350px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Accessing history logs...</span>
              </div>
            ) : (
              <>
                {/* 1. TIMELINE LOG PANEL */}
                {activeTab === 'timeline' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b">
                      Interaction Timeline
                    </h4>
                    {activities.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        No recent interaction activities recorded.
                      </div>
                    ) : (
                      <div className="relative border-l border-slate-200 pl-4 space-y-4">
                        {activities.map((act) => (
                          <div key={act.id} className="relative text-xs">
                            {/* Dot */}
                            <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border border-white ${
                              act.type === 'enquiry' ? 'bg-blue-600' :
                              act.type === 'service' ? 'bg-orange-500' :
                              act.type === 'demo' ? 'bg-yellow-500' : 'bg-slate-400'
                            }`} />
                            
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-800">{act.action}</span>
                              <span className="text-[10px] text-slate-400">{new Date(act.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-600 mt-0.5">{act.details}</p>
                            <span className="text-[10px] text-slate-400 italic mt-0.5 block">Logged by {act.user}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. ENQUIRIES HISTORY PANEL */}
                {activeTab === 'enquiries' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b mb-2">
                      Enquiry History
                    </h4>
                    {enquiries.map(enq => (
                      <div key={enq.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-slate-800">{enq.brand} - {enq.product}</div>
                          <div className="text-[10px] text-slate-400">Created {new Date(enq.createdAt).toLocaleDateString()} | Type: {enq.enquiryType}</div>
                          {enq.remarks && <div className="text-slate-600 mt-1 italic text-[11px]">&quot;{enq.remarks}&quot;</div>}
                        </div>
                        <div>
                          {getStatusBadge(enq.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. SERVICES PANEL */}
                {activeTab === 'services' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b mb-2">
                      Associated Service Center Tickets
                    </h4>
                    {services.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        No service logs active for this client.
                      </div>
                    ) : (
                      services.map(srv => (
                        <div key={srv.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-start text-xs">
                          <div>
                            <div className="font-bold text-slate-800">{srv.product}</div>
                            <div className="text-rose-700 mt-0.5">Issue: {srv.issue}</div>
                            <div className="text-slate-400 text-[10px] mt-1">Technician: {srv.technicianName || 'Pending'} | Fees: ₹{srv.charges || 0}</div>
                          </div>
                          <div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              srv.status === 'Completed' ? 'bg-green-50 text-green-700' :
                              srv.status === 'In Progress' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100'
                            }`}>{srv.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 4. DEMOS PANEL */}
                {activeTab === 'demos' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b mb-2">
                      Product Demonstrations
                    </h4>
                    {demos.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        No product demos scheduled or completed.
                      </div>
                    ) : (
                      demos.map(dm => (
                        <div key={dm.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-start text-xs">
                          <div>
                            <div className="font-bold text-slate-800">{dm.brand} {dm.product}</div>
                            <div className="text-slate-500 mt-0.5">Scheduled for: {dm.scheduledDate}</div>
                            {dm.feedback && <div className="text-slate-500 mt-1 italic">&quot;{dm.feedback}&quot;</div>}
                          </div>
                          <div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              dm.status === 'Completed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                            }`}>{dm.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 5. FOLLOW-UPS PANEL */}
                {activeTab === 'followups' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b mb-2">
                      CRM Follow-up Timeline
                    </h4>
                    {followups.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        No follow-up interactions logged.
                      </div>
                    ) : (
                      followups.map(fup => (
                        <div key={fup.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <span>Method: {fup.type}</span>
                            </div>
                            <div className="text-slate-400 text-[10px]">Due Date: {fup.scheduledDate}</div>
                            {fup.outcome && <p className="text-green-700 mt-1">Outcome: {fup.outcome}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              fup.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>{fup.status}</span>
                            <button
                              onClick={() => handleDeleteFollowUp(fup.id)}
                              className="p-1 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-lg transition shrink-0 cursor-pointer"
                              title="Delete Follow-up Log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
