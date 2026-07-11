import React, { useState, useEffect } from 'react';
import { Enquiry, ServiceLog, DemoLog } from '../types';
import { db } from '../lib/database';
import { FileText, Download, Calendar, Filter, ShoppingCart, BarChart } from 'lucide-react';

interface ReportsViewProps {
  userEmail: string;
}

export default function ReportsView({ userEmail }: ReportsViewProps) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [services, setServices] = useState<ServiceLog[]>([]);
  const [demos, setDemos] = useState<DemoLog[]>([]);
  const [cycle, setCycle] = useState<'Daily' | 'Weekly' | 'Monthly'>('Monthly');
  const [isLoading, setIsLoading] = useState(true);

  // Stats computed on active cycle
  const [filteredEnquiries, setFilteredEnquiries] = useState<Enquiry[]>([]);
  const [salesSummary, setSalesSummary] = useState({
    total: 0,
    converted: 0,
    pending: 0,
    conversionRate: 0,
    sourcesBreakdown: {} as Record<string, number>,
    categoryBreakdown: {} as Record<string, number>
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const enqs = await db.getEnquiries();
      const srvs = await db.getServices();
      const dms = await db.getDemos();

      setEnquiries(enqs);
      setServices(srvs);
      setDemos(dms);
    } catch (e) {
      console.error('Error fetching data for reports:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (enquiries.length === 0) return;

    const now = new Date();
    let cutoff = new Date();

    if (cycle === 'Daily') {
      cutoff.setHours(0, 0, 0, 0); // Today only
    } else if (cycle === 'Weekly') {
      cutoff.setDate(now.getDate() - 7); // Last 7 days
    } else if (cycle === 'Monthly') {
      cutoff.setMonth(now.getMonth() - 1); // Last 30 days
    }

    const filtered = enquiries.filter(e => {
      const createdDate = new Date(e.createdAt);
      return createdDate >= cutoff;
    });

    setFilteredEnquiries(filtered);

    // Compute metrics
    const total = filtered.length;
    const converted = filtered.filter(e => e.status === 'Converted').length;
    const pending = filtered.filter(e => e.status !== 'Converted' && e.status !== 'Closed' && e.status !== 'Cold').length;
    const rate = total > 0 ? Math.round((converted / total) * 100) : 0;

    const sources: Record<string, number> = {};
    const categories: Record<string, number> = {};

    filtered.forEach(e => {
      sources[e.source] = (sources[e.source] || 0) + 1;
      categories[e.product] = (categories[e.product] || 0) + 1;
    });

    setSalesSummary({
      total,
      converted,
      pending,
      conversionRate: rate,
      sourcesBreakdown: sources,
      categoryBreakdown: categories
    });

  }, [enquiries, cycle]);

  // Convert array to CSV string & Trigger download
  const handleExportCSV = (type: 'enquiries' | 'services' | 'demos') => {
    let csvContent = '';
    let fileName = '';

    if (type === 'enquiries') {
      const headers = ['ID', 'Customer Name', 'Mobile', 'Alternate Mobile', 'City', 'Product', 'Brand', 'Model', 'Type', 'Source', 'Status', 'Follow-up Date', 'Created At', 'Created By'];
      const rows = filteredEnquiries.map(e => [
        e.id,
        `"${e.customerName.replace(/"/g, '""')}"`,
        e.mobile,
        e.altMobile || '',
        e.city || '',
        `"${e.product}"`,
        `"${e.brand}"`,
        `"${e.model || ''}"`,
        e.enquiryType,
        e.source,
        e.status,
        e.followUpDate,
        e.createdAt,
        e.createdBy
      ]);

      csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      fileName = `Paradise_Enquiries_${cycle}_Report.csv`;
    } else if (type === 'services') {
      const headers = ['ID', 'Customer Name', 'Product', 'Issue', 'Technician', 'Charges', 'Status', 'Logged At'];
      const rows = services.map(s => [
        s.id,
        `"${s.customerName.replace(/"/g, '""')}"`,
        `"${s.product}"`,
        `"${s.issue.replace(/"/g, '""')}"`,
        s.technicianName || '',
        s.charges || 0,
        s.status,
        s.loggedAt
      ]);

      csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      fileName = `Paradise_Service_Jobs.csv`;
    } else if (type === 'demos') {
      const headers = ['ID', 'Customer Name', 'Product', 'Brand', 'Model', 'Scheduled Date', 'Demonstrator', 'Status', 'Feedback'];
      const rows = demos.map(d => [
        d.id,
        `"${d.customerName.replace(/"/g, '""')}"`,
        `"${d.product}"`,
        `"${d.brand}"`,
        d.model || '',
        d.scheduledDate,
        d.demonstratorName || '',
        d.status,
        `"${(d.feedback || '').replace(/"/g, '""')}"`
      ]);

      csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      fileName = `Paradise_Scheduled_Demos.csv`;
    }

    // Trigger raw browser download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    db.logActivity('system', 'CSV Report Exported', `Exported standard CSV report: ${fileName}`, userEmail);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-2 font-sans">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs">Compiling financial performance metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Selector Heading */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-icons text-blue-700">query_stats</span>
            Paradise Sales &amp; Operation Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare operations and export raw datasets to standard CSV files instantly.
          </p>
        </div>

        {/* Cycle Pill selectors */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
          {(['Daily', 'Weekly', 'Monthly'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setCycle(opt)}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                cycle === opt ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Filtered Enquiries</span>
          <p className="text-2xl font-black text-slate-900 mt-1 font-display">{salesSummary.total}</p>
          <span className="text-[10px] text-slate-400">Raised in active cycle</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Converted Sales</span>
          <p className="text-2xl font-black text-emerald-700 mt-1 font-display">{salesSummary.converted}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Closed Won</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">In-Pipeline Enquiries</span>
          <p className="text-2xl font-black text-amber-700 mt-1 font-display">{salesSummary.pending}</p>
          <span className="text-[10px] text-amber-600 font-medium">Currently open/negotiating</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Won Conversion Ratio</span>
          <p className="text-2xl font-black text-blue-700 mt-1 font-display">{salesSummary.conversionRate}%</p>
          <span className="text-[10px] text-blue-600 font-medium">Percentage of total sales</span>
        </div>
      </div>

      {/* Interactive Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source Breakdown Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b pb-3">
            <BarChart className="w-4 h-4 text-blue-700" />
            Lead Source Distribution ({cycle})
          </h3>

          <div className="space-y-3.5">
            {Object.keys(salesSummary.sourcesBreakdown).length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10">No data available for this cycle</p>
            ) : (
              (Object.entries(salesSummary.sourcesBreakdown) as [string, number][]).map(([source, count]) => {
                const percentage = Math.round((count / salesSummary.total) * 100);
                return (
                  <div key={source} className="text-xs">
                    <div className="flex justify-between font-semibold mb-1 text-slate-700">
                      <span>{source}</span>
                      <span>{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Product Category Distribution list */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b pb-3">
            <ShoppingCart className="w-4 h-4 text-blue-700" />
            Top Product Categories Focus ({cycle})
          </h3>

          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {Object.keys(salesSummary.categoryBreakdown).length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10">No categories recorded yet</p>
            ) : (
              (Object.entries(salesSummary.categoryBreakdown) as [string, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => (
                  <div key={category} className="flex justify-between items-center text-xs p-2 bg-slate-50 border rounded-lg">
                    <span className="font-bold text-slate-800">{category}</span>
                    <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-md text-[10px]">{count} Leads</span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* CSV Export panel card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
            <Download className="w-4 h-4 text-blue-700" />
            CRM Raw Dataset CSV Exporter
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Click any of the targets below to fetch data records from local tables and generate immediate system downloads.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Download 1 */}
          <button
            onClick={() => handleExportCSV('enquiries')}
            className="p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition text-left cursor-pointer flex justify-between items-center group"
          >
            <div>
              <h4 className="text-xs font-extrabold text-slate-700 group-hover:text-blue-800 transition">Customer Enquiries</h4>
              <p className="text-[10px] text-slate-400 mt-1">Export filtered {cycle} list</p>
            </div>
            <span className="material-icons text-xl text-blue-600 bg-white p-2 rounded-lg border shadow-sm">file_download</span>
          </button>

          {/* Download 2 */}
          <button
            onClick={() => handleExportCSV('services')}
            className="p-4 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 rounded-xl transition text-left cursor-pointer flex justify-between items-center group"
          >
            <div>
              <h4 className="text-xs font-extrabold text-slate-700 group-hover:text-orange-800 transition">Service Job Tickets</h4>
              <p className="text-[10px] text-slate-400 mt-1">Export full list of service repair tickets</p>
            </div>
            <span className="material-icons text-xl text-orange-600 bg-white p-2 rounded-lg border shadow-sm">file_download</span>
          </button>

          {/* Download 3 */}
          <button
            onClick={() => handleExportCSV('demos')}
            className="p-4 bg-slate-50 hover:bg-yellow-50 border border-slate-200 hover:border-yellow-300 rounded-xl transition text-left cursor-pointer flex justify-between items-center group"
          >
            <div>
              <h4 className="text-xs font-extrabold text-slate-700 group-hover:text-yellow-800 transition">Scheduled Product Demos</h4>
              <p className="text-[10px] text-slate-400 mt-1">Export full history of product demos</p>
            </div>
            <span className="material-icons text-xl text-yellow-600 bg-white p-2 rounded-lg border shadow-sm">file_download</span>
          </button>
        </div>
      </div>
    </div>
  );
}
