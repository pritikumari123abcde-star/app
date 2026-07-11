import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Enquiry, EnquiryStatus } from '../types';
import { 
  Phone, MessageSquare, X, Check, Calendar, Clock, 
  HelpCircle, ChevronRight, PhoneCall, MessageCircle, AlertCircle
} from 'lucide-react';

interface QuickActionDrawerProps {
  isOpen: boolean;
  enquiry: Enquiry;
  type: 'Call' | 'WhatsApp';
  onClose: () => void;
  onSaveOutcome: (outcome: {
    statusUpdate?: EnquiryStatus;
    notes: string;
    scheduleFollowUp?: boolean;
    followUpDate?: string;
  }) => void;
}

export default function QuickActionDrawer({
  isOpen,
  enquiry,
  type,
  onClose,
  onSaveOutcome
}: QuickActionDrawerProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [statusUpdate, setStatusUpdate] = useState<EnquiryStatus | 'NO_CHANGE'>('NO_CHANGE');
  const [scheduleFollowUp, setScheduleFollowUp] = useState<boolean>(false);
  const [followUpDate, setFollowUpDate] = useState<string>(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] // Default to 2 days ahead
  );

  const callPresets = [
    'Connected, interested in pricing',
    'No Answer / Busy',
    'Asked to call back later',
    'Not Interested (Cold Lead)',
    'Confirmed purchase / Converted!'
  ];

  const whatsappPresets = [
    'Sent product brochure & pricing details',
    'Discussed options on WhatsApp chat',
    'No reply received yet',
    'Customer sent query for follow-up',
    'Shared shop location & demo video'
  ];

  const presets = type === 'Call' ? callPresets : whatsappPresets;

  const handleSelectPreset = (preset: string) => {
    setSelectedPreset(preset);
    setCustomNotes(preset);

    // Auto-map some smart status modifications based on choice
    if (preset.includes('pricing') || preset.includes('interested') || preset.includes('query')) {
      setStatusUpdate('Interested');
    } else if (preset.includes('Not Interested') || preset.includes('No reply')) {
      setStatusUpdate('Cold');
    } else if (preset.includes('Confirmed purchase') || preset.includes('Converted')) {
      setStatusUpdate('Converted');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNotes = customNotes.trim() || selectedPreset || `Logged ${type} outcome.`;
    onSaveOutcome({
      statusUpdate: statusUpdate === 'NO_CHANGE' ? undefined : statusUpdate,
      notes: finalNotes,
      scheduleFollowUp,
      followUpDate: scheduleFollowUp ? followUpDate : undefined
    });
  };

  if (!isOpen) return null;

  const formatPhoneNumber = (num: string) => {
    return num;
  };

  return (
    <div className="absolute inset-0 z-50 overflow-hidden flex flex-col justify-end">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity"
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative bg-white rounded-t-[32px] border-t border-slate-200 shadow-2xl flex flex-col max-h-[90%] z-10 font-sans"
      >
        {/* Notch Header drag indicator */}
        <div className="w-full flex justify-center py-2 shrink-0">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Drawer Title */}
        <div className="px-5 pb-3 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${type === 'Call' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
              {type === 'Call' ? <Phone className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">
                {type === 'Call' ? 'Log Quick Call' : 'Log WhatsApp Interaction'}
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                For {enquiry.customerName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body Scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
          {/* Quick Action Trigger Button */}
          <div className="bg-slate-50 border border-slate-100/80 rounded-2xl p-3.5 flex items-center justify-between shadow-inner">
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Tap to Initiate</span>
              <p className="text-xs font-black text-slate-800 font-mono">
                {formatPhoneNumber(enquiry.mobile)}
              </p>
            </div>

            {type === 'Call' ? (
              <a 
                href={`tel:${enquiry.mobile}`}
                onClick={() => {
                  // Wait brief moment or log immediate default activity
                }}
                className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Now</span>
              </a>
            ) : (
              <a 
                href={`https://wa.me/${enquiry.mobile.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Open WhatsApp</span>
              </a>
            )}
          </div>

          {/* Presets Grid */}
          <div className="space-y-2">
            <span className="block text-[9px] uppercase font-black text-slate-400 tracking-wider">Quick Outcome Selection</span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => {
                const isSelected = selectedPreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-xl border transition text-left cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold' 
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Controls */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Notes Textarea */}
            <div className="space-y-1.5">
              <label className="block text-[9px] uppercase font-black text-slate-400 tracking-wider">
                Interaction Details / Custom Notes
              </label>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Type details about this interaction..."
                rows={2}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
              />
            </div>

            {/* Custom status selector & optional follow-up in columns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[9px] uppercase font-black text-slate-400 tracking-wider">
                  Update Lead Status
                </label>
                <select
                  value={statusUpdate}
                  onChange={(e) => setStatusUpdate(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none text-slate-700 font-bold"
                >
                  <option value="NO_CHANGE">No Status Change</option>
                  <option value="New">New Lead</option>
                  <option value="Interested">Interested</option>
                  <option value="Cold">Cold</option>
                  <option value="Hot">🔥 Hot Lead</option>
                  <option value="Converted">💰 Sold / Converted</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="flex flex-col justify-end pb-1.5">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={scheduleFollowUp}
                    onChange={(e) => setScheduleFollowUp(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Schedule Follow-up</span>
                </label>
              </div>
            </div>

            {/* Next follow-up Date picker if scheduled */}
            {scheduleFollowUp && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-1.5 overflow-hidden"
              >
                <label className="block text-[9px] uppercase font-black text-slate-400 tracking-wider">
                  Select Next Contact Date
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    required={scheduleFollowUp}
                    className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-lg hover:shadow-slate-200"
              >
                <Check className="w-4 h-4 text-green-400" />
                <span>Save Outcome &amp; Update CRM</span>
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
