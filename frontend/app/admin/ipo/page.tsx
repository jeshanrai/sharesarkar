"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, BarChart3, Plus, Edit } from "lucide-react";

interface IPOItem {
  id: number;
  company_name: string;
  symbol: string;
  sector: string;
  share_type: string;
  units: number;
  price_per_unit: number;
  total_amount: string;
  open_date: string;
  close_date: string;
  listing_date: string | null;
  status: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminIPOPage() {
  const router = useRouter();
  const [ipos, setIpos] = useState<IPOItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadIPOs() {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/ipo/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
        return;
      }
      setIpos(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIPOs();
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Delete this IPO listing?")) return;
    const token = localStorage.getItem("admin_token");
    try {
      await fetch(`${API_URL}/api/ipo/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setIpos(ipos.filter(i => i.id !== id));
    } catch {
      alert("Failed to delete");
    }
  }

  if (loading) {
     return <div className="p-8 text-center text-gray-500">Loading IPO listings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IPO Management</h1>
          <p className="text-sm text-gray-500">Manage Upcoming, Open, and Listed IPOs</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22]">
          <Plus className="w-4 h-4" /> Add IPO
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Company</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Dates</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ipos.map((ipo) => (
              <tr key={ipo.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-semibold text-gray-900">{ipo.company_name} ({ipo.symbol})</p>
                  <p className="text-xs text-gray-500">{ipo.share_type} • {ipo.units.toLocaleString()} units</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase
                    ${ipo.status === 'open' ? 'bg-green-100 text-green-700' : 
                      ipo.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : 
                      'bg-gray-100 text-gray-700'}`}>
                    {ipo.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                   <p className="text-xs text-gray-600">Open: {new Date(ipo.open_date).toLocaleDateString()}</p>
                   <p className="text-xs text-gray-600">Close: {new Date(ipo.close_date).toLocaleDateString()}</p>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 text-gray-400 hover:text-blue-600" title="Edit"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(ipo.id)} className="p-2 text-gray-400 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {ipos.length === 0 && (
               <tr><td colSpan={4} className="p-8 text-center text-gray-500">No IPO listings found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
