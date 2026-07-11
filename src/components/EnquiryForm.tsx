import React, { useState, useEffect } from 'react';
import { Enquiry, EnquiryType, EnquirySource, EnquiryStatus } from '../types';
import { Sparkles, Clipboard, Check, Phone, Info } from 'lucide-react';
import { db } from '../lib/database';

const DEFAULT_CATEGORIES = [
  "AC", "Air Fryer", "Almirah", "Battery", "Blower", "Book Cabinet", "CCTV", "Chair", "Chimney", "Clock", "Cooker", "Cooktop", "Cooler", "Deep Freezer", "Desktop", "Dining Table", "Fan", "Fridge", "Geyser", "Heater", "Home Theater", "Induction", "Inverter", "Iron", "JMG", "Juicer", "Kettle", "Laptop", "LED", "Mattress", "Microwave", "Mixer Grinder", "Mobile", "Oil Filled Heater", "Other", "Pillow", "Printer", "RO System", "Sandwich Maker", "Shoe Cabinet", "Stabilizer", "Stool", "Tea Table", "Toaster", "Trolley", "Vacuum Cleaner", "Visi Cooler", "Washing Machine", "Water Purifier", "Wrist Watch"
];

const SOURCES: EnquirySource[] = ['Walk-in', 'Call', 'WhatsApp', 'JustDial', 'Facebook', 'Website', 'Other'];
const TYPES: EnquiryType[] = ['Sales', 'Service', 'Demo', 'General'];
const STATUSES: EnquiryStatus[] = ['New', 'Interested', 'Cold', 'Hot', 'Service Logged', 'Demo Scheduled', 'Converted', 'Closed'];

interface EnquiryFormProps {
  enquiry?: Enquiry; // If passed, we are in Edit Mode
  onSave: (enquiryData: Omit<Enquiry, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  creatorName: string;
}

export default function EnquiryForm({ enquiry, onSave, onCancel, creatorName }: EnquiryFormProps) {
  // Form State
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [altMobile, setAltMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [product, setProduct] = useState('Other');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [enquiryType, setEnquiryType] = useState<EnquiryType>('Sales');
  const [source, setSource] = useState<EnquirySource>('Walk-in');
  const [status, setStatus] = useState<EnquiryStatus>('New');
  const [followUpDate, setFollowUpDate] = useState('');
  const [remarks, setRemarks] = useState('');

  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const dynamicCats = await db.getCategories();
        if (dynamicCats && dynamicCats.length > 0) {
          setCategories(dynamicCats.map(c => c.name));
        }
      } catch (err) {
        console.error("Failed to load categories in EnquiryForm:", err);
      }
    };
    fetchCats();
  }, []);

  // Truecaller Paste States
  const [truecallerInput, setTruecallerInput] = useState('');
  const [isTruecallerOpen, setIsTruecallerOpen] = useState(false);
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load enquiry if edit mode
  useEffect(() => {
    if (enquiry) {
      setCustomerName(enquiry.customerName);
      setMobile(enquiry.mobile);
      setAltMobile(enquiry.altMobile || '');
      setAddress(enquiry.address || '');
      setCity(enquiry.city || '');
      setPinCode(enquiry.pinCode || '');
      setProduct(enquiry.product);
      setBrand(enquiry.brand);
      setModel(enquiry.model || '');
      setEnquiryType(enquiry.enquiryType);
      setSource(enquiry.source);
      setStatus(enquiry.status);
      setFollowUpDate(enquiry.followUpDate || '');
      setRemarks(enquiry.remarks || '');
    } else {
      // Pre-fill tomorrow as default follow-up date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFollowUpDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [enquiry]);

  // Clean and validate number to exactly 10 digits
  const cleanAndValidatePhone = (phone: string): { valid: boolean; cleaned: string } => {
    // Strip non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove +91 / 91 country code prefixes
    if (cleaned.startsWith('91') && cleaned.length > 10) {
      cleaned = cleaned.substring(2);
    }
    
    return {
      valid: cleaned.length === 10,
      cleaned: cleaned
    };
  };

  const handleTruecallerParse = () => {
    if (!truecallerInput.trim()) {
      setPasteFeedback('Please paste some text or links first.');
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
    let parsedAddress = '';
    let parsedRemarks = '';
    let parsedProduct = 'Other';

    // 1. Detect Category match in text
    const textLower = sanitizedInput.toLowerCase();
    const sortedCategories = [...categories].sort((a, b) => b.length - a.length);
    for (const cat of sortedCategories) {
      const regex = new RegExp(`\\b${cat.toLowerCase()}\\b`, 'i');
      if (regex.test(textLower)) {
        parsedProduct = cat;
        break;
      }
    }

    const addressCandidates: string[] = [];

    // 2. Parse line by line
    for (const line of lines) {
      const isUrl = line.startsWith('http://') || line.startsWith('https://');
      const digitsOnly = line.replace(/\D/g, '');
      const isPhone = (line.startsWith('+') && digitsOnly.length >= 10) || (digitsOnly.length >= 10 && !isUrl);

      if (isUrl) {
        // Look for phone at the end of truecaller search url
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
        // Text line
        if (!parsedName) {
          parsedName = line;
        } else {
          // If contains product names, skip or use as remarks
          const lineLower = line.toLowerCase();
          const hasRemarks = lineLower.includes('customer') || lineLower.includes('interested') || lineLower.includes('sent using') || lineLower.includes('enquiry') || sortedCategories.some(cat => lineLower.includes(cat.toLowerCase()));
          
          if (hasRemarks) {
            parsedRemarks = parsedRemarks ? parsedRemarks + ' ' + line : line;
          } else {
            addressCandidates.push(line);
          }
        }
      }
    }

    if (addressCandidates.length > 0) {
      parsedAddress = addressCandidates.join(', ');
    }

    // Strip unneeded phrases from remarks
    if (parsedRemarks) {
      parsedRemarks = parsedRemarks
        .replace(/sent using truecaller/gi, '')
        .replace(/customer/gi, '')
        .trim();
    }

    // Apply updates
    if (parsedName) {
      const lowerName = parsedName.toLowerCase().trim();
      if (lowerName !== 'anjali papa' && !lowerName.includes('anjali papa')) {
        setCustomerName(parsedName);
      }
    }
    if (parsedPhone) setMobile(parsedPhone);
    if (parsedAddress) setAddress(parsedAddress);
    // Remarks are explicitly not auto-filled as per requirements
    if (parsedProduct !== 'Other') setProduct(parsedProduct);

    // Autofill city if state exists in address
    if (parsedAddress.toLowerCase().includes('bihar')) {
      setCity('Patna');
    }

    setPasteFeedback('Successfully parsed and populated details!');
    setTimeout(() => {
      setIsTruecallerOpen(false);
      setTruecallerInput('');
      setPasteFeedback(null);
    }, 1200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError('Customer name is required.');
      return;
    }

    // Phone number validation
    const mobileVal = cleanAndValidatePhone(mobile);
    if (!mobileVal.valid) {
      setError('Customer Mobile must be a valid 10-digit number.');
      return;
    }

    if (altMobile) {
      const altVal = cleanAndValidatePhone(altMobile);
      if (!altVal.valid) {
        setError('Alternate Mobile must be a valid 10-digit number or empty.');
        return;
      }
    }

    // Build saved object
    onSave({
      customerName: customerName.trim(),
      mobile: mobileVal.cleaned,
      altMobile: altMobile ? cleanAndValidatePhone(altMobile).cleaned : undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      pinCode: pinCode.trim() || undefined,
      product,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      enquiryType,
      source,
      status,
      followUpDate: followUpDate || undefined,
      remarks: remarks.trim() || undefined,
      createdBy: enquiry ? enquiry.createdBy : creatorName,
      assignedTo: enquiry ? enquiry.assignedTo : creatorName
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 max-w-4xl mx-auto font-sans relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="material-icons text-blue-700">rate_review</span>
            {enquiry ? 'Modify Customer Enquiry' : 'Log New Customer Enquiry'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Fill the standard CRM fields or use the Truecaller auto-fill engine for speed.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsTruecallerOpen(true)}
          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
          <span>Paste Truecaller Details</span>
        </button>
      </div>

      {/* Truecaller parser overlay */}
      {isTruecallerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="bg-gradient-to-r from-blue-700 to-blue-900 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-200" />
                <h3 className="font-bold text-sm uppercase tracking-wider font-display">Truecaller Auto Fill</h3>
              </div>
              <button 
                type="button" 
                onClick={() => { setIsTruecallerOpen(false); setTruecallerInput(''); setPasteFeedback(null); }}
                className="text-white/80 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Tip:</strong> Directly paste the Truecaller details block or link. Our system automatically scrubs country codes, formats numbers, and scans lines for matches against our 50 product categories!
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Paste Truecaller Text Block
                </label>
                <textarea
                  rows={6}
                  placeholder="Paste details here (e.g. Name, Mobile, Location, Search Link...)"
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={truecallerInput}
                  onChange={(e) => setTruecallerInput(e.target.value)}
                />
              </div>

              {pasteFeedback && (
                <div className="p-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{pasteFeedback}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsTruecallerOpen(false); setTruecallerInput(''); }}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTruecallerParse}
                  className="px-4 py-2 bg-blue-700 text-white text-xs font-semibold rounded-xl hover:bg-blue-800 flex items-center gap-1.5 shadow"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Process & Auto-Fill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-semibold flex items-center gap-2">
          <span className="material-icons text-sm">error_outline</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Section 1: Customer Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider pb-1 border-b border-slate-100">
              1. Customer Identity
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Customer Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Chulbul Pandey"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  Primary Mobile *
                </label>
                <input
                  type="text"
                  required
                  placeholder="10-digit number"
                  maxLength={13}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Alternate Mobile (Optional)
                </label>
                <input
                  type="text"
                  placeholder="10-digit number"
                  maxLength={13}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={altMobile}
                  onChange={(e) => setAltMobile(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Street Address (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Flat 301, Sector 5, Fraser Road"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Patna"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  PIN Code
                </label>
                <input
                  type="text"
                  placeholder="6-digit PIN"
                  maxLength={6}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Product & CRM details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider pb-1 border-b border-slate-100">
              2. Product & Source Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Product Category (Optional)
                </label>
                <select
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Brand Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sony, LG, Daikin"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Model Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. XR-55A80L or GL-T422"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Enquiry Type (Optional)
                </label>
                <select
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  value={enquiryType}
                  onChange={(e) => setEnquiryType(e.target.value as EnquiryType)}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Source (Optional)
                </label>
                <select
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  value={source}
                  onChange={(e) => setSource(e.target.value as EnquirySource)}
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Lead Status (Optional)
                </label>
                <select
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EnquiryStatus)}
                >
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Next Follow-up Date (Optional)
                </label>
                <input
                  type="date"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Remarks Section */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Key Remarks / Conversation Notes
          </label>
          <textarea
            rows={3}
            placeholder="Log customer interest level, specific queries, discounts requested..."
            className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition shadow-md hover:shadow-lg cursor-pointer"
          >
            {enquiry ? 'Save Changes' : 'Raise Enquiry'}
          </button>
        </div>
      </form>
    </div>
  );
}
