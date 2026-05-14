export default function IpoLoading() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="h-8 w-48 bg-gray-100 skeleton mb-8 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-5 space-y-3">
            <div className="h-5 bg-gray-100 skeleton rounded" />
            <div className="h-4 w-3/4 bg-gray-100 skeleton rounded" />
            <div className="h-3 w-1/2 bg-gray-100 skeleton rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
