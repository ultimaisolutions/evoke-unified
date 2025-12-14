import { useState, useEffect } from 'react';
import { adsApi } from '../../lib/api';
import { cn, truncate, getScoreClass } from '../../lib/utils';
import { Image, Film, Check, ChevronDown, Search, Loader2 } from 'lucide-react';

export function AdSelector({ selectedAd, onSelect }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    try {
      setLoading(true);
      const result = await adsApi.list(50, 0);
      // Only show completed ads
      const completedAds = (result.data || []).filter(ad => ad.status === 'completed');
      setAds(completedAds);
    } catch (error) {
      console.error('Failed to load ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAds = ads.filter(ad =>
    ad.original_filename?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (ad) => {
    onSelect(ad);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-muted-foreground mb-2">
        Select Analyzed Ad
      </label>

      {/* Dropdown trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-3',
          'px-4 py-3 rounded-xl border',
          'bg-card/50 hover:bg-card/80 transition-colors',
          isOpen ? 'border-purple-500' : 'border-border',
          'text-left'
        )}
      >
        {selectedAd ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
              'bg-purple-500/10'
            )}>
              {selectedAd.file_type === 'video' ? (
                <Film className="w-5 h-5 text-purple-400" />
              ) : (
                <Image className="w-5 h-5 text-purple-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {selectedAd.original_filename}
              </p>
              <p className="text-xs text-muted-foreground">
                Score: {Math.round(selectedAd.overall_score || 0)}/100
              </p>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">Choose an ad to analyze reactions for...</span>
        )}
        <ChevronDown className={cn(
          'w-5 h-5 text-muted-foreground transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-border bg-card shadow-xl">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
            ) : filteredAds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {ads.length === 0 ? 'No analyzed ads found. Upload and analyze an ad first.' : 'No ads match your search.'}
              </div>
            ) : (
              filteredAds.map((ad) => (
                <button
                  key={ad.id}
                  onClick={() => handleSelect(ad)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg',
                    'hover:bg-muted/50 transition-colors text-left',
                    selectedAd?.id === ad.id && 'bg-purple-500/10'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    'bg-muted'
                  )}>
                    {ad.file_type === 'video' ? (
                      <Film className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Image className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate text-sm">
                      {ad.original_filename}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-xs',
                        getScoreClass(ad.overall_score || 0)
                      )}>
                        {Math.round(ad.overall_score || 0)}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {ad.file_type}
                      </span>
                    </div>
                  </div>

                  {selectedAd?.id === ad.id && (
                    <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdSelector;
