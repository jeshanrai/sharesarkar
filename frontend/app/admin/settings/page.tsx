"use client";

import { Settings, Save } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-sm text-gray-500">Configure global portal settings</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
         <div className="p-6 space-y-6">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Site Title</label>
               <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl" defaultValue="ShareSanskar" />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
               <input type="email" className="w-full px-4 py-2 border border-gray-200 rounded-xl" defaultValue="contact@sharesanskar.com" />
            </div>
            <div className="pt-4 border-t border-gray-100">
               <button className="flex items-center gap-2 px-6 py-2.5 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22]">
                  <Save className="w-4 h-4" /> Save Settings
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
