import { AdCard } from './AdCard';

export function AdGrid({ ads, onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {ads.map((ad) => (
        <AdCard key={ad.id} ad={ad} onSelect={onSelect} />
      ))}
    </div>
  );
}

export default AdGrid;
