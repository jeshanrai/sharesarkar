export default function NewsLoading() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      {/* Page heading skeleton */}
      <div className="h-8 w-48 bg-gray-100 skeleton mb-8 rounded" />

      {/* Article card skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[16/9] bg-gray-100 skeleton rounded" />
            <div className="h-3 w-24 bg-gray-100 skeleton rounded" />
            <div className="h-5 bg-gray-100 skeleton rounded" />
            <div className="h-5 w-4/5 bg-gray-100 skeleton rounded" />
            <div className="h-3 w-32 bg-gray-100 skeleton rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
