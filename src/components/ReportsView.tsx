import React, { useState, useEffect } from 'react';
import { Enquiry, ServiceLog, DemoLog } from '../types';
import { db } from '../lib/database';
import { Download, ShoppingCart, BarChart } from 'lucide-react';

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

  const [leaderboards, setLeaderboards] = useState({
    conversions: [] as { name: string; count: number; total: number }[],
    services: [] as { name: string; count: number; revenue: number }[],
    demos: [] as { name: string; count: number }[]
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

    // Compute dynamic leaderboards based on the active cycle filter
    const conversionCounts: Record<string, { count: number; total: number }> = {};
    filtered.forEach(e => {
      const creator = e.createdBy || 'Unknown Staff';
      if (!conversionCounts[creator]) {
        conversionCounts[creator] = { count: 0, total: 0 };
      }
      conversionCounts[creator].total += 1;
      if (e.status === 'Converted') {
        conversionCounts[creator].count += 1;
      }
    });
    const conversionsLeaderboard = Object.entries(conversionCounts)
      .map(([name, stats]) => ({ name, count: stats.count, total: stats.total }))
      .sort((a, b) => b.count - a.count || b.total - a.total)
      .slice(0, 5);

    // Compute services metrics matching active cycle
    const filteredServices = services.filter(s => new Date(s.loggedAt) >= cutoff);
    const serviceCounts: Record<string, { count: number; revenue: number }> = {};
    filteredServices.forEach(s => {
      const tech = s.technicianName || 'Unassigned';
      if (!serviceCounts[tech]) {
        serviceCounts[tech] = { count: 0, revenue: 0 };
      }
      if (s.status === 'Completed') {
        serviceCounts[tech].count += 1;
        serviceCounts[tech].revenue += s.charges || 0;
      }
    });
    const servicesLeaderboard = Object.entries(serviceCounts)
      .map(([name, stats]) => ({ name, count: stats.count, revenue: stats.revenue }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
      .slice(0, 5);

    // Compute demos metrics matching active cycle or scheduled demos
    const demoCounts: Record<string, number> = {};
    demos.forEach(d => {
      const demoer = d.demonstratorName || 'Unassigned';
      if (d.status === 'Completed' || d.status === 'Scheduled') {
        demoCounts[demoer] = (demoCounts[demoer] || 0) + 1;
      }
    });
    const demosLeaderboard = Object.entries(demoCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setLeaderboards({
      conversions: conversionsLeaderboard,
      services: servicesLeaderboard,
      demos: demosLeaderboard
    });

  }, [enquiries, services, demos, cycle]);

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

  // PDF Export Trigger
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocker is preventing PDF export. Please allow popups for this site.');
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const sourcesHtml = (Object.entries(salesSummary.sourcesBreakdown) as [string, number][])
      .map(([source, count]) => {
        const percentage = Math.round((count / salesSummary.total) * 100);
        return `
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 11px; color: #374151; margin-bottom: 4px;">
              <span>${source}</span>
              <span>${count} (${percentage}%)</span>
            </div>
            <div style="width: 100%; background-color: #f3f4f6; height: 8px; border-radius: 4px; overflow: hidden;">
              <div style="background-color: #1d4ed8; width: ${percentage}%; height: 100%; border-radius: 4px;"></div>
            </div>
          </div>
        `;
      }).join('');

    const categoriesHtml = (Object.entries(salesSummary.categoryBreakdown) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; padding: 6px 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 6px;">
          <span style="font-weight: 700; color: #1f2937;">${category}</span>
          <span style="background: #dbeafe; color: #1e40af; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${count} Leads</span>
        </div>
      `).join('');

    const leaderboardHtml = leaderboards.conversions.map((item, index) => {
      const rate = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0;
      return `
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 8px; font-size: 11px; text-align: center; font-weight: bold; color: #374151;">#${index + 1}</td>
          <td style="padding: 8px; font-size: 11px; font-weight: bold; color: #1f2937;">${item.name}</td>
          <td style="padding: 8px; font-size: 11px; text-align: center; color: #047857; font-weight: bold;">${item.count} Won</td>
          <td style="padding: 8px; font-size: 11px; text-align: center; color: #4b5563;">${item.total} Total</td>
          <td style="padding: 8px; font-size: 11px; text-align: right; font-weight: bold; color: #1d4ed8;">${rate}%</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Paradise Group CRM - Executive Performance Summary (${cycle})</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;950&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #111827;
              padding: 40px;
              line-height: 1.5;
              background-color: #ffffff;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1d4ed8; padding-bottom: 20px; margin-bottom: 30px;">
            <div>
              <h1 style="font-size: 24px; font-weight: 950; color: #1e3a8a; margin: 0; text-transform: uppercase; letter-spacing: -0.5px;">Paradise Group Electronics</h1>
              <p style="font-size: 12px; color: #4b5563; margin: 4px 0 0 0;">CRM Executive Sales & Operations Performance Summary</p>
            </div>
            <div style="text-align: right;">
              <span style="background: #1e40af; color: white; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase;">${cycle} Cycle Report</span>
              <p style="font-size: 10px; color: #9ca3af; margin: 6px 0 0 0;">Generated on: ${todayStr}</p>
            </div>
          </div>

          <!-- KPI Metric Blocks -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px;">
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 10px;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.5px;">Filtered Enquiries</span>
              <div style="font-size: 20px; font-weight: 950; color: #111827; margin-top: 4px;">${salesSummary.total}</div>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 10px;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.5px;">Converted Sales</span>
              <div style="font-size: 20px; font-weight: 950; color: #15803d; margin-top: 4px;">${salesSummary.converted}</div>
            </div>
            <div style="background: #fffbeb; border: 1px solid #fef08a; padding: 12px; border-radius: 10px;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #854d0e; letter-spacing: 0.5px;">In-Pipeline Enquiries</span>
              <div style="font-size: 20px; font-weight: 950; color: #b45309; margin-top: 4px;">${salesSummary.pending}</div>
            </div>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 10px;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #1e40af; letter-spacing: 0.5px;">Conversion Rate</span>
              <div style="font-size: 20px; font-weight: 950; color: #1d4ed8; margin-top: 4px;">${salesSummary.conversionRate}%</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
            <!-- Lead Source -->
            <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px;">
              <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #4b5563; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 0; margin-bottom: 15px;">Lead Source Distribution</h3>
              ${sourcesHtml || '<p style="font-size: 11px; color: #9ca3af;">No data available</p>'}
            </div>

            <!-- Top Categories -->
            <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px;">
              <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #4b5563; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 0; margin-bottom: 15px;">Top Product Categories Focus</h3>
              ${categoriesHtml || '<p style="font-size: 11px; color: #9ca3af;">No data available</p>'}
            </div>
          </div>

          <!-- Staff Conversion Leaderboard -->
          <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
            <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #4b5563; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 0; margin-bottom: 15px;">Staff Conversion Leaderboard</h3>
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 8px; font-size: 11px; color: #6b7280; font-weight: bold; width: 60px; text-align: center;">Rank</th>
                  <th style="padding: 8px; font-size: 11px; color: #6b7280; font-weight: bold;">Operator / Staff</th>
                  <th style="padding: 8px; font-size: 11px; color: #6b7280; font-weight: bold; text-align: center;">Won Leads</th>
                  <th style="padding: 8px; font-size: 11px; color: #6b7280; font-weight: bold; text-align: center;">Total Leads Created</th>
                  <th style="padding: 8px; font-size: 11px; color: #6b7280; font-weight: bold; text-align: right;">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                ${leaderboardHtml || '<tr><td colspan="5" style="padding: 20px; text-align: center; font-size: 11px; color: #9ca3af;">No conversion metrics recorded yet</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- Bottom Summary Section -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px; font-size: 10px; color: #64748b; text-align: center;">
            This is an autogenerated performance assessment document produced by Paradise Group CRM. The statistics reflected above correspond directly to real-time entries logged in local and cloud-replicated transaction databases.
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();

    db.logActivity('system', 'PDF Report Exported', `Generated and exported executive performance PDF report for ${cycle} cycle.`, userEmail);
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
            Compare operations, audit staff standings, and export data records instantly.
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

      {/* Executive PDF Report Card */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-950 rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-100">
        <div className="space-y-1">
          <h3 className="text-sm font-bold font-display flex items-center gap-1.5 text-white">
            <span className="material-icons text-blue-300">picture_as_pdf</span>
            Executive PDF Report Generator
          </h3>
          <p className="text-xs text-blue-200 max-w-xl">
            Compile the active {cycle} cycle analytics, customer conversions, category metrics, and staff standings into a single printable executive PDF document instantly.
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          className="bg-white hover:bg-blue-50 text-blue-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <span className="material-icons text-base text-red-600">picture_as_pdf</span>
          <span>Generate Executive PDF Report</span>
        </button>
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

      {/* Staff Leaderboards Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
            <span className="material-icons text-blue-700">military_tech</span>
            Sales &amp; Service Staff Leaderboards ({cycle})
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Real-time performance rankings computed from registered sales, service fulfillments, and product demonstrations.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Sales Conversions */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider pb-1.5 border-b border-slate-200/60 font-display">
              <span className="material-icons text-emerald-600 text-sm">workspace_premium</span>
              <span>Enquiry Conversion Ranking</span>
            </div>
            <div className="space-y-2">
              {leaderboards.conversions.length === 0 ? (
                <p className="text-center text-[11px] text-slate-400 py-6">No conversions in this cycle</p>
              ) : (
                leaderboards.conversions.map((item, index) => {
                  const rate = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-100 shadow-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                          index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          index === 1 ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                          index === 2 ? 'bg-amber-50 text-amber-900 border border-amber-100' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-emerald-700">{item.count} Won</span>
                        <span className="text-[9px] text-slate-400 block">{item.total} Total ({rate}%)</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: Technician Fulfillments */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3 font-display">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider pb-1.5 border-b border-slate-200/60 font-display">
              <span className="material-icons text-orange-600 text-sm">build</span>
              <span>Resolved Service Tickets</span>
            </div>
            <div className="space-y-2 font-sans">
              {leaderboards.services.length === 0 ? (
                <p className="text-center text-[11px] text-slate-400 py-6">No resolved services in this cycle</p>
              ) : (
                leaderboards.services.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-100 shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                        index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        index === 1 ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                        index === 2 ? 'bg-amber-50 text-amber-900 border border-amber-100' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-orange-700">{item.count} Done</span>
                      <span className="text-[9px] text-slate-400 block">₹{(item.revenue || 0).toLocaleString('en-IN')} charges</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 3: Demonstrations Completed */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3 font-display">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider pb-1.5 border-b border-slate-200/60 font-display">
              <span className="material-icons text-blue-600 text-sm">play_circle</span>
              <span>Demos &amp; Displays Conducted</span>
            </div>
            <div className="space-y-2 font-sans">
              {leaderboards.demos.length === 0 ? (
                <p className="text-center text-[11px] text-slate-400 py-6">No demos scheduled in this cycle</p>
              ) : (
                leaderboards.demos.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-100 shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                        index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        index === 1 ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                        index === 2 ? 'bg-amber-50 text-amber-900 border border-amber-100' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-blue-700">{item.count} Demo{item.count !== 1 ? 's' : ''}</span>
                      <span className="text-[9px] text-slate-400 block">Conducted</span>
                    </div>
                  </div>
                ))
              )}
            </div>
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
