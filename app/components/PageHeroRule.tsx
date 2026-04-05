/** Thin gold accent under inner page titles — improves scan and section hierarchy */
export default function PageHeroRule() {
  return (
    <div
      className="mx-auto mt-2.5 h-0.5 w-16 rounded-full bg-gradient-to-r from-transparent via-champagne-700 to-champagne-600 from-[12%] via-50% to-[88%] shadow-[0_0_12px_rgba(143,114,40,0.25)]"
      aria-hidden
    />
  );
}
