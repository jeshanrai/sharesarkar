"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Users, Download } from "lucide-react";

interface Subscriber {
  id: number;
  email: string;
  created_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminSubscribersPage() {
  const router = useRouter();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSubscribers() {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/subscribers/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
        return;
      }
      setSubscribers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscribers();
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Delete this subscriber?")) return;
    const token = localStorage.getItem("admin_token");
    try {
      await fetch(`${API_URL}/api/subscribers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscribers(subscribers.filter(s => s.id !== id));
    } catch {
      alert("Failed to delete");
    }
  }

  if (loading) {
     return <div className="p-8 text-center text-gray-500">Loading subscribers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter Subscribers</h1>
          <p className="text-sm text-gray-500">Manage email subscriptions for your newsletter</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-sm font-medium border border-gray-200">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Email Address</th>
              <th className="px-6 py-4">Subscribed Date</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {subscribers.map((sub) => (
              <tr key={sub.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                        {sub.email.charAt(0).toUpperCase()}
                     </div>
                     <span className="font-medium text-gray-900">{sub.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(sub.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric'})}
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(sub.id)} className="p-2 text-gray-400 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {subscribers.length === 0 && (
               <tr><td colSpan={3} className="p-8 text-center text-gray-500">No subscribers found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
