export default function ArticleLoading() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Eyebrow */}
        <div className="h-3 w-28 bg-gray-100 skeleton rounded" />
        {/* Headline */}
        <div className="h-10 bg-gray-100 skeleton rounded" />
        <div className="h-10 w-3/4 bg-gray-100 skeleton rounded" />
        {/* Byline */}
        <div className="h-3 w-48 bg-gray-100 skeleton rounded" />
        {/* Hero image */}
        <div className="aspect-[16/9] bg-gray-100 skeleton rounded" />
        {/* Body */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-100 skeleton rounded" style={{ width: i % 3 === 2 ? "80%" : "100%" }} />
        ))}
      </div>
    </div>
  );
}
