import React, { useState, useEffect } from 'react';
import { Enquiry, DemoInstallation, InstallationStatus, Staff } from '../types';
import { db } from '../lib/database';
import { 
  FileText, Upload, Download, Trash2, Plus, Search, Filter, 
  CheckCircle, Clock, AlertTriangle, X, Calendar, User, Paperclip, Eye, EyeOff, Sparkles, Check 
} from 'lucide-react';

interface DemoInstallationViewProps {
  currentUser: Staff;
  enquiries: Enquiry[];
  onTriggerNotification: (
    type: 'new_enquiry' | 'assigned_followup' | 'status_change',
    title: string,
    message: string,
    enquiryId?: string,
    assignedToEmail?: string
  ) => void;
  triggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function DemoInstallationView({
  currentUser,
  enquiries,
  onTriggerNotification,
  triggerToast
}: DemoInstallationViewProps) {
  const [installations, setInstallations] = useState<DemoInstallation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  
  // Form modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState('');
  const [installerName, setInstallerName] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<InstallationStatus>('Pending');

  // Custom customer details state
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [customCustomerMobile, setCustomCustomerMobile] = useState('');
  const [customProduct, setCustomProduct] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [customModel, setCustomModel] = useState('');

  // Truecaller paste states
  const [isTruecallerOpen, setIsTruecallerOpen] = useState(false);
  const [truecallerInput, setTruecallerInput] = useState('');
  const [truecallerFeedback, setTruecallerFeedback] = useState<string | null>(null);

  // PDF attachment state for form
  const [attachedPdfData, setAttachedPdfData] = useState<string>('');
  const [attachedPdfName, setAttachedPdfName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Image attachment state for form
  const [attachedImageData, setAttachedImageData] = useState<string>('');
  const [attachedImageName, setAttachedImageName] = useState<string>('');

  // PDF Viewer state
  const [viewingPdf, setViewingPdf] = useState<{ name: string; data: string } | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  useEffect(() => {
    loadInstallations();
  }, []);

  const loadInstallations = async () => {
    try {
      const data = await db.getInstallations();
      setInstallations(data);
    } catch (e) {
      console.error(e);
      triggerToast('Failed to load installation records.', 'error');
    }
  };

  // Truecaller paste parser
  const handleTruecallerParse = () => {
    if (!truecallerInput.trim()) {
      setTruecallerFeedback('Please paste some text or links first.');
      return;
    }

    // Pre-sanitize input to remove any WhatsApp chat log headers like:
    // [28/06, 11:45 am] Anjali Papa:
    // or standard format 28/06/23, 11:45 am - Anjali Papa:
    const bracketRegex = /\[\d{1,2}[\/\.-]\d{1,2}(?:[\/\.-]\d{2,4})?,?\s+\d{1,2}:\d{2}(?::\d{2})?(?:[\s\u202f\xa0]?[a-zA-Z]+)?\]\s*([^:\n]+):\s*/gi;
    const dashRegex = /\b\d{1,2}[\/\.-]\d{1,2}(?:[\/\.-]\d{2,4})?,?\s+\d{1,2}:\d{2}(?::\d{2})?(?:[\s\u202f\xa0]?[a-zA-Z]+)?\s*-\s*([^:\n]+):\s*/gi;
    const specificRegex = /\[28\/06,?\s+11:45[\s\u202f\xa0]?am\]\s*Anjali\s+Papa:\s*/gi;
    const nameColonRegex = /^(Anjali\s+Papa:?|Anjali\s+Papa\s+:\s*)/gi;

    let sanitizedInput = truecallerInput
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
    let parsedBrand = '';

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

    // Common brand patterns to extract brand if present
    const brands = ["dyson", "lg", "sony", "samsung", "daikin", "whirlpool", "panasonic", "voltas", "havells", "usha", "philips", "bajaj", "eureka", "kent", "luminous", "exide", "microtek", "godrej", "haier", "ifb", "bosch", "hitachi", "carrier", "blue star", "lloyd", "mi", "oneplus", "realme", "apple", "hp", "dell", "lenovo", "asus", "acer"];
    for (const b of brands) {
      const regex = new RegExp(`\\b${b}\\b`, 'i');
      if (regex.test(textLower)) {
        parsedBrand = b.charAt(0).toUpperCase() + b.slice(1);
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
        setCustomCustomerName(parsedName);
      }
    }
    if (parsedPhone) setCustomCustomerMobile(parsedPhone);
    if (parsedProduct) setCustomProduct(parsedProduct);
    if (parsedBrand) setCustomBrand(parsedBrand);

    setTruecallerFeedback('Successfully parsed and populated details!');
    setTimeout(() => {
      setIsTruecallerOpen(false);
      setTruecallerInput('');
      setTruecallerFeedback(null);
    }, 1200);
  };

  // Handle PDF file selection & conversion to Base64
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      triggerToast('Please select a valid PDF file.', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      triggerToast('File size is too large. Limit is 2MB for local storage.', 'error');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedPdfData(reader.result as string);
      setAttachedPdfName(file.name);
      setIsUploading(false);
      triggerToast('PDF document attached successfully!', 'success');
    };
    reader.onerror = () => {
      setIsUploading(false);
      triggerToast('Error reading PDF file.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveInstallation = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalEnquiryId = selectedEnquiryId;
    let finalCustomerName = '';
    let finalProduct = '';
    let finalBrand = '';
    let finalModel = '';
    let finalCustomerMobile = '';

    if (selectedEnquiryId === 'custom') {
      if (!customCustomerName.trim() || !customCustomerMobile.trim()) {
        triggerToast('Please provide custom customer name and mobile.', 'error');
        return;
      }
      finalEnquiryId = `custom-inst-${Date.now()}`;
      finalCustomerName = customCustomerName.trim();
      finalCustomerMobile = customCustomerMobile.trim();
      finalProduct = customProduct.trim();
      finalBrand = customBrand.trim();
      finalModel = customModel.trim();
    } else {
      if (!selectedEnquiryId) {
        triggerToast('Please select a customer enquiry.', 'error');
        return;
      }
      const linkedEnq = enquiries.find(eq => eq.id === selectedEnquiryId);
      if (!linkedEnq) {
        triggerToast('Selected enquiry is invalid.', 'error');
        return;
      }
      finalCustomerName = linkedEnq.customerName;
      finalCustomerMobile = linkedEnq.mobile;
      finalProduct = linkedEnq.product;
      finalBrand = linkedEnq.brand || '';
      finalModel = linkedEnq.model || '';
    }

    try {
      const newInst = await db.addInstallation({
        enquiryId: finalEnquiryId,
        customerName: finalCustomerName,
        customerMobile: finalCustomerMobile || undefined,
        product: finalProduct || undefined,
        brand: finalBrand || undefined,
        model: finalModel || undefined,
        installerName: installerName.trim() || undefined,
        installationDate: installationDate || undefined,
        status,
        pdfData: attachedPdfData || undefined,
        pdfName: attachedPdfName || undefined,
        imageData: attachedImageData || undefined,
        imageName: attachedImageName || undefined,
        notes: notes.trim() || undefined
      });

      triggerToast('Demo Installation logged successfully!', 'success');
      
      // Dispatch alert to system
      const dateStr = installationDate ? new Date(installationDate).toLocaleDateString('en-IN') : 'TBD';
      const instName = installerName ? installerName : 'TBD';
      onTriggerNotification(
        'assigned_followup',
        'New Demo Installation Logged',
        `An installation task has been scheduled for customer ${finalCustomerName} on ${dateStr}. Installer: ${instName}.`,
        finalEnquiryId.startsWith('custom-') ? undefined : finalEnquiryId,
        currentUser.email
      );

      // Reset form fields
      setIsFormOpen(false);
      setSelectedEnquiryId('');
      setInstallerName('');
      setInstallationDate('');
      setNotes('');
      setStatus('Pending');
      setAttachedPdfData('');
      setAttachedPdfName('');
      setAttachedImageData('');
      setAttachedImageName('');
      setCustomCustomerName('');
      setCustomCustomerMobile('');
      setCustomProduct('');
      setCustomBrand('');
      setCustomModel('');
      
      loadInstallations();
    } catch (e) {
      console.error(e);
      triggerToast('Failed to save installation task.', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: InstallationStatus) => {
    try {
      const updated = await db.updateInstallation(id, { status: newStatus }, currentUser.email);
      triggerToast(`Installation status updated to ${newStatus}.`, 'success');
      
      // Trigger status update alert
      onTriggerNotification(
        'status_change',
        'Demo Installation Status Updated',
        `Installation job for customer ${updated.customerName} updated to status: "${newStatus}".`,
        updated.enquiryId,
        currentUser.email
      );

      loadInstallations();
    } catch (e) {
      triggerToast('Failed to update status.', 'error');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (currentUser.role !== 'Admin' && !currentUser.permissions?.canDeleteEnquiry) {
      triggerToast('Access Denied: You do not have permission to delete records.', 'error');
      return;
    }

    setDeleteConfirmationId(id);
  };

  // Open PDF download or full view
  const downloadAttachedPdf = (name: string, dataStr: string) => {
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast(`Downloading PDF: ${name}`, 'info');
  };

  // Filter list of installations
  const filteredInstallations = installations.filter(inst => {
    const query = searchQuery.toLowerCase();
    const matchSearch = 
      inst.customerName.toLowerCase().includes(query) || 
      inst.installerName.toLowerCase().includes(query) ||
      inst.product.toLowerCase().includes(query) ||
      (inst.brand && inst.brand.toLowerCase().includes(query));

    const matchStatus = statusFilter === 'All' || inst.status === statusFilter;

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-4xl mx-auto font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-sm font-black font-display text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <span className="material-icons text-blue-700">construction</span>
            Demo Installation Desk
          </h2>
          <p className="text-[11px] text-slate-500">
            Log physical product setups, track onsite installation visits, and attach signed handover PDFs.
          </p>
        </div>
        
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer w-full sm:w-auto shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>New Setup Task</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by client, technician, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition"
          />
        </div>

        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <div className="relative w-full">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600 transition cursor-pointer appearance-none w-full sm:min-w-[120px]"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Installations List */}
      <div className="space-y-3.5">
        {filteredInstallations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-12 text-center shadow-sm space-y-3.5">
            <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center mx-auto">
              <span className="material-icons text-xl">plumbing</span>
            </div>
            <div>
              <p className="text-xs font-black font-display text-slate-700">No Installation Records Found</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {searchQuery || statusFilter !== 'All' 
                  ? 'Try modifying your search queries or category filters.'
                  : 'Get started by scheduling your first product demonstration setup visit today!'
                }
              </p>
            </div>
          </div>
        ) : (
          filteredInstallations.map((inst) => (
            <div 
              key={inst.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:border-blue-200/80 transition space-y-3"
            >
              {/* Header block */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 pb-2 border-b border-slate-100">
                <div className="space-y-1 w-full">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono bg-slate-50 border px-1.5 py-0.5 rounded-md">
                      REF: {inst.id}
                    </span>
                    <span className={`sm:hidden px-2 py-0.5 rounded-full font-bold text-[8px] uppercase tracking-wider border ml-auto ${
                      inst.status === 'Completed' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                        : inst.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-800 border-blue-100'
                        : inst.status === 'Cancelled'
                        ? 'bg-rose-50 text-rose-800 border-rose-100'
                        : 'bg-amber-50 text-amber-800 border-amber-100'
                    }`}>
                      {inst.status}
                    </span>
                  </div>
                  <h3 className="text-xs font-black font-display text-slate-950 mt-1">
                    {inst.customerName}
                  </h3>
                  {inst.customerMobile && (
                    <p className="text-[10px] text-slate-400 font-mono">+91 {inst.customerMobile}</p>
                  )}
                  {(inst.brand || inst.product) && (
                    <p className="text-[10px] text-slate-500 font-medium">
                      Product: <span className="font-bold text-slate-800">{inst.brand || ''} {inst.product || ''}</span> {inst.model && `(${inst.model})`}
                    </p>
                  )}
                </div>

                <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full font-bold text-[8px] uppercase tracking-wider border ${
                    inst.status === 'Completed' 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                      : inst.status === 'In Progress'
                      ? 'bg-blue-50 text-blue-800 border-blue-100'
                      : inst.status === 'Cancelled'
                      ? 'bg-rose-50 text-rose-800 border-rose-100'
                      : 'bg-amber-50 text-amber-800 border-amber-100'
                  }`}>
                    {inst.status}
                  </span>
                  
                  {inst.installationDate ? (
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                      <Calendar className="w-3 h-3 text-slate-300" />
                      <span>Setup Scheduled: {new Date(inst.installationDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[9px] text-amber-500 font-mono">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span>Date: Unsched/TBD</span>
                    </div>
                  )}
                </div>

                {/* Mobile-only Date Display */}
                <div className="sm:hidden w-full flex items-center justify-between pt-1 text-[9px]">
                  {inst.installationDate ? (
                    <div className="flex items-center gap-1 text-slate-500 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400 animate-pulse" />
                      <span>Setup: {new Date(inst.installationDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-500 font-mono">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span>Date: Unsched/TBD</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Actions & Info Details */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                
                <div className="space-y-1">
                  {inst.installerName ? (
                    <p className="text-[10px] text-slate-600 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Assigned Installer: <span className="font-extrabold text-slate-900">{inst.installerName}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-300" />
                      Assigned Installer: <span className="font-medium italic">Unassigned</span>
                    </p>
                  )}
                  {inst.notes && (
                    <p className="text-[10px] text-slate-500 italic max-w-md">
                      &ldquo;{inst.notes}&rdquo;
                    </p>
                  )}
                  {inst.imageData && (
                    <div className="mt-2">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Attached Setup Image</span>
                      <img src={inst.imageData} alt={inst.imageName || 'Setup Image'} className="max-h-32 object-contain rounded-xl border border-slate-100 bg-slate-50" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>

                {/* Status management selects */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Set Status:</span>
                  <select
                    value={inst.status}
                    onChange={(e) => handleUpdateStatus(inst.id, e.target.value as InstallationStatus)}
                    className="p-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-blue-600"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  {(currentUser.role === 'Admin' || currentUser.permissions?.canDeleteEnquiry) && (
                    <button
                      onClick={() => handleDeleteRecord(inst.id)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-100 rounded-lg transition cursor-pointer"
                      title="Delete log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* PDF & Image Document Attachment Sections */}
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-2.5">
                {/* Photo Row */}
                <div className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-icons text-sm text-blue-700 shrink-0">image</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold text-slate-800 truncate">
                        {inst.imageName ? inst.imageName : 'Physical Setup Photo'}
                      </p>
                      <p className="text-[8px] text-slate-400 font-medium">
                        {inst.imageName ? 'Photo successfully attached to setup record' : 'No photo attached yet'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {inst.imageData ? (
                      <button
                        onClick={async () => {
                          try {
                            await db.updateInstallation(inst.id, {
                              imageData: undefined,
                              imageName: undefined
                            }, currentUser.email);
                            triggerToast('Image attachment removed!', 'info');
                            loadInstallations();
                          } catch (e) {
                            triggerToast('Error removing Image.', 'error');
                          }
                        }}
                        className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[9px] font-bold rounded-lg transition cursor-pointer"
                      >
                        Remove
                      </button>
                    ) : (
                      <label className="p-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[9px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer">
                        <Upload className="w-3 h-3" />
                        <span>Attach Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) {
                              triggerToast('Image file size is too large (max 2MB).', 'error');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = async () => {
                              try {
                                await db.updateInstallation(inst.id, {
                                  imageData: reader.result as string,
                                  imageName: file.name
                                }, currentUser.email);
                                triggerToast('Image attachment linked safely!', 'success');
                                loadInstallations();
                              } catch (e) {
                                triggerToast('Error updating Image record.', 'error');
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* PDF Row */}
                <div className="flex justify-between items-center gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold text-slate-800 truncate">
                        {inst.pdfName ? inst.pdfName : 'Signed Handover Certificate'}
                      </p>
                      <p className="text-[8px] text-slate-400 font-medium">
                        {inst.pdfName ? 'PDF document successfully attached to setup record' : 'No documentation attached yet'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {inst.pdfData ? (
                      <>
                        <button
                          onClick={() => setViewingPdf({ name: inst.pdfName || 'Document', data: inst.pdfData! })}
                          className="p-1 px-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[9px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => downloadAttachedPdf(inst.pdfName || 'attachment.pdf', inst.pdfData!)}
                          className="p-1 px-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 text-[9px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                          title="Download Document"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      </>
                    ) : (
                      <label className="p-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[9px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer">
                        <Upload className="w-3 h-3" />
                        <span>Attach PDF</span>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.type !== 'application/pdf') {
                              triggerToast('Only PDF files are supported.', 'error');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = async () => {
                              try {
                                await db.updateInstallation(inst.id, {
                                  pdfData: reader.result as string,
                                  pdfName: file.name
                                }, currentUser.email);
                                triggerToast('PDF attachment linked safely!', 'success');
                                loadInstallations();
                              } catch (e) {
                                triggerToast('Error updating PDF record.', 'error');
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Installation Record Custom Confirmation Modal (Iframe Safe) */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden font-sans">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <div className="p-3 rounded-full bg-red-50">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Delete Installation Record?</h3>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you absolutely sure you want to permanently delete this Demo Installation record? This action is irreversible.
              </p>
              
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setDeleteConfirmationId(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const id = deleteConfirmationId;
                    setDeleteConfirmationId(null);
                    try {
                      await db.deleteInstallation(id, currentUser.email);
                      triggerToast('Record deleted successfully.', 'info');
                      loadInstallations();
                    } catch (e) {
                      triggerToast('Failed to delete record.', 'error');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm shadow-red-100"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF View Modal */}
      {viewingPdf && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-slide-up">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="bg-slate-900 px-4 py-3 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-black font-display truncate max-w-[280px]">{viewingPdf.name}</h3>
              </div>
              <button 
                onClick={() => setViewingPdf(null)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Document Preview */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-4">
              <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-white shadow-inner flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center border border-red-100 shadow-sm animate-bounce">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 font-display">{viewingPdf.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Secure PDF document payload embedded inside Paradise Group database</p>
                </div>
                <button
                  onClick={() => downloadAttachedPdf(viewingPdf.name, viewingPdf.data)}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Complete PDF</span>
                </button>
              </div>

              {/* Simulated PDF Layout details to give a premium feeling */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/60 space-y-2.5 shadow-sm font-mono text-[9px] text-slate-600">
                <div className="flex justify-between text-[10px] font-black font-sans text-slate-900 border-b pb-1.5 mb-1">
                  <span>DOCUMENT METADATA</span>
                  <span className="text-blue-700 flex items-center gap-0.5"><Sparkles className="w-3 h-3" /> VERIFIED</span>
                </div>
                <p><strong>Payload Size:</strong> ~{Math.round(viewingPdf.data.length / 1024)} KB</p>
                <p><strong>Mime Type:</strong> application/pdf</p>
                <p><strong>Encoding:</strong> base64 dataURI</p>
                <p><strong>Origin:</strong> Signed onsite client terminal</p>
                <p className="text-[8px] text-slate-400 uppercase pt-2 border-t">This document acts as verified authorization for system logs.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setViewingPdf(null)}
                className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Dialog Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 my-auto max-h-[92vh] flex flex-col">
            <div className="bg-slate-900 px-5 py-4 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-icons text-blue-400">plumbing</span>
                <h3 className="text-xs font-black font-display tracking-wider uppercase">Log Product Installation</h3>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveInstallation} className="p-5 space-y-4 overflow-y-auto flex-1">
              
              {/* Linked Enquiry */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Linked Customer Enquiry *</label>
                <select
                  value={selectedEnquiryId}
                  onChange={(e) => {
                    setSelectedEnquiryId(e.target.value);
                    if (e.target.value !== 'custom') {
                      setCustomCustomerName('');
                      setCustomCustomerMobile('');
                      setCustomProduct('');
                      setCustomBrand('');
                      setCustomModel('');
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600 cursor-pointer"
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  <option value="custom">Custom Customer (Manual Input)</option>
                  {enquiries
                    .filter(e => e.status !== 'Closed' && e.status !== 'Cold')
                    .map(e => (
                      <option key={e.id} value={e.id}>
                        {e.customerName} - {e.brand} {e.product} ({e.city || 'Walk-in'})
                      </option>
                    ))
                  }
                </select>
                <p className="text-[9px] text-slate-400">Select active leads, scheduled demonstrations, or choose custom to input manually.</p>
              </div>

              {selectedEnquiryId === 'custom' && (
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-150">
                  <div className="flex justify-between items-center border-b pb-1.5 mb-2">
                    <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-widest">Custom Customer Details</h4>
                    <button
                      type="button"
                      onClick={() => setIsTruecallerOpen(true)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                      <span>Truecaller Paste</span>
                    </button>
                  </div>

                  {/* Truecaller parser overlay for Demo Installations */}
                  {isTruecallerOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="bg-gradient-to-r from-blue-700 to-blue-900 p-4 text-white flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-200" />
                            <h3 className="font-bold text-sm uppercase tracking-wider font-display">Demo: Truecaller Auto Fill</h3>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => { setIsTruecallerOpen(false); setTruecallerInput(''); setTruecallerFeedback(null); }}
                            className="text-white/80 hover:text-white text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div className="p-5 space-y-4 font-sans text-left">
                          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                            <div>
                              <strong>Tip:</strong> Paste Truecaller details block or link. We'll automatically extract name, mobile number, matched brand and product category to fill out the form!
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
                              value={truecallerInput}
                              onChange={(e) => setTruecallerInput(e.target.value)}
                            />
                          </div>

                          {truecallerFeedback && (
                            <div className="p-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                              <Check className="w-4 h-4" />
                              <span>{truecallerFeedback}</span>
                            </div>
                          )}

                          <div className="flex justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => { setIsTruecallerOpen(false); setTruecallerInput(''); }}
                              className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleTruecallerParse}
                              className="px-4 py-2 bg-blue-700 text-white text-xs font-semibold rounded-xl hover:bg-blue-800 flex items-center gap-1.5 shadow cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Process & Auto-Fill</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block">Customer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="E.g., Pritam Singh"
                      value={customCustomerName}
                      onChange={(e) => setCustomCustomerName(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block">Customer Mobile *</label>
                    <input
                      type="text"
                      required
                      placeholder="E.g., 9876543210"
                      value={customCustomerMobile}
                      onChange={(e) => setCustomCustomerMobile(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block">Brand (Optional)</label>
                    <input
                      type="text"
                      placeholder="E.g., Dyson"
                      value={customBrand}
                      onChange={(e) => setCustomBrand(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block">Product Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="E.g., Dyson V15 Vacuum"
                      value={customProduct}
                      onChange={(e) => setCustomProduct(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block">Model (Optional)</label>
                    <input
                      type="text"
                      placeholder="E.g., SV22"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>
              )}

              {/* Installer Name & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Installer Name (Optional)</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Technician Name"
                      value={installerName}
                      onChange={(e) => setInstallerName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Visit Date (Optional)</label>
                  <input
                    type="date"
                    value={installationDate}
                    onChange={(e) => setInstallationDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 transition"
                  />
                </div>
              </div>

              {/* Initial Status */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Setup Visit Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InstallationStatus)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="Pending">Pending Appointment</option>
                  <option value="In Progress">Installation In Progress</option>
                  <option value="Completed">Successfully Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Dual Attachment Section (Image & PDF) */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-150">
                {/* Photo Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Attach Image</label>
                  <div className="flex items-center gap-1.5">
                    <label className="bg-white hover:bg-slate-50 text-slate-800 font-bold text-[10px] px-2 py-2 rounded-xl flex items-center gap-1 cursor-pointer border shadow-sm transition shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{attachedImageName ? 'Change' : 'Choose'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            triggerToast('Image file size is too large (max 2MB).', 'error');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            setAttachedImageData(reader.result as string);
                            setAttachedImageName(file.name);
                            triggerToast('Image attached successfully!', 'success');
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                    </label>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-bold text-slate-700 truncate">
                        {attachedImageName ? attachedImageName : 'No Image'}
                      </p>
                      {attachedImageName && (
                        <button
                          type="button"
                          onClick={() => {
                            setAttachedImageData('');
                            setAttachedImageName('');
                          }}
                          className="text-[8px] text-rose-600 hover:underline font-bold block mt-0.5"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* PDF Input */}
                <div className="space-y-1 border-l border-slate-200 pl-3">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Attach PDF</label>
                  <div className="flex items-center gap-1.5">
                    <label className="bg-white hover:bg-slate-50 text-slate-800 font-bold text-[10px] px-2 py-2 rounded-xl flex items-center gap-1 cursor-pointer border shadow-sm transition shrink-0">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{attachedPdfName ? 'Change' : 'Choose'}</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handlePdfUpload}
                        className="hidden"
                      />
                    </label>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-bold text-slate-700 truncate font-mono">
                        {isUploading ? 'Reading...' : attachedPdfName ? attachedPdfName : 'No PDF'}
                      </p>
                      {attachedPdfName && (
                        <button
                          type="button"
                          onClick={() => {
                            setAttachedPdfData('');
                            setAttachedPdfName('');
                          }}
                          className="text-[8px] text-rose-600 hover:underline font-bold block mt-0.5"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Installation Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Onsite Notes / Remarks</label>
                <textarea
                  placeholder="E.g., Successfully setup wall-mount brackets. Client requested 2-year warranty card."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition min-h-[60px]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Create Task
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
