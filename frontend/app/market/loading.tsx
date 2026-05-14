export default function MarketLoading() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="h-8 w-52 bg-gray-100 skeleton mb-8 rounded" />
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-2">
            <div className="h-3 w-24 bg-gray-100 skeleton rounded" />
            <div className="h-7 w-20 bg-gray-100 skeleton rounded" />
            <div className="h-3 w-16 bg-gray-100 skeleton rounded" />
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex gap-4">
          {["Symbol", "Last", "Change", "% Change", "Volume"].map((h) => (
            <div key={h} className="h-3 w-16 bg-gray-100 skeleton rounded" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-gray-50">
            <div className="h-4 w-14 bg-gray-100 skeleton rounded" />
            <div className="h-4 w-12 bg-gray-100 skeleton rounded" />
            <div className="h-4 w-12 bg-gray-100 skeleton rounded" />
            <div className="h-4 w-14 bg-gray-100 skeleton rounded" />
            <div className="h-4 w-16 bg-gray-100 skeleton rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
