import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';

export function AdFilters({ filters, onChange }) {
  const updateFilter = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search ads..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className={cn(
            'w-full pl-10 pr-4 py-2.5 rounded-xl',
            'bg-card/50 border border-border/50',
            'text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
            'transition-all'
          )}
        />
      </div>

      {/* File type filter */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/50">
        {['all', 'image', 'video'].map((type) => (
          <button
            key={type}
            onClick={() => updateFilter('fileType', type)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm transition-colors capitalize',
              filters.fileType === type
                ? 'bg-purple-500 text-white'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Sort dropdown */}
      <select
        value={`${filters.sortBy}-${filters.sortOrder}`}
        onChange={(e) => {
          const [sortBy, sortOrder] = e.target.value.split('-');
          onChange({ ...filters, sortBy, sortOrder });
        }}
        className={cn(
          'px-3 py-2.5 rounded-xl',
          'bg-card/50 border border-border/50',
          'text-sm text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
          'cursor-pointer'
        )}
      >
        <option value="created_at-desc">Newest First</option>
        <option value="created_at-asc">Oldest First</option>
        <option value="overall_score-desc">Highest Score</option>
        <option value="overall_score-asc">Lowest Score</option>
        <option value="original_filename-asc">Name A-Z</option>
        <option value="original_filename-desc">Name Z-A</option>
      </select>
    </div>
  );
}

export default AdFilters;
