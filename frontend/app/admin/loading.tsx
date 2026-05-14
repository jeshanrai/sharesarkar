export default function AdminLoading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 bg-gray-100 skeleton rounded" />
        <div className="h-9 w-28 bg-gray-100 skeleton rounded" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-2">
            <div className="h-3 w-20 bg-gray-100 skeleton rounded" />
            <div className="h-8 w-16 bg-gray-100 skeleton rounded" />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-gray-50">
            <div className="h-4 w-4/12 bg-gray-100 skeleton rounded" />
            <div className="h-4 w-2/12 bg-gray-100 skeleton rounded" />
            <div className="h-4 w-2/12 bg-gray-100 skeleton rounded" />
            <div className="h-4 w-2/12 bg-gray-100 skeleton rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
