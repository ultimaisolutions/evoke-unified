import { useState, useEffect, useCallback } from 'react';
import { adsApi } from '../lib/api';
import { AdGrid } from '../components/ads/AdGrid';
import { AdList } from '../components/ads/AdList';
import { AdDetailModal } from '../components/ads/AdDetailModal';
import { AdFilters } from '../components/ads/AdFilters';
import {
  ImageIcon, LayoutGrid, List, Loader2, RefreshCw,
  FolderOpen, Upload, TrendingUp, Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';

export function AdsPage() {
  // State
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedAdId, setSelectedAdId] = useState(null);
  const [selectedAdDetails, setSelectedAdDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    fileType: 'all',
  });

  // Load ads on mount
  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const result = await adsApi.list(100, 0);
      const completedAds = (result.data || []).filter(ad => ad.status === 'completed');
      setAds(completedAds);
    } catch (err) {
      console.error('Failed to load ads:', err);
      setError(err.message || 'Failed to load ads');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadAds(true);
  };

  const handleSelectAd = useCallback(async (adId) => {
    setSelectedAdId(adId);
    setLoadingDetails(true);
    setSelectedAdDetails(null);

    try {
      const result = await adsApi.get(adId);
      setSelectedAdDetails(result.data);
    } catch (err) {
      console.error('Failed to load ad details:', err);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedAdId(null);
    setSelectedAdDetails(null);
  }, []);

  // Apply filters and sorting
  const getFilteredAds = () => {
    let filtered = [...ads];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(ad =>
        ad.original_filename?.toLowerCase().includes(searchLower)
      );
    }

    // File type filter
    if (filters.fileType !== 'all') {
      filtered = filtered.filter(ad => ad.file_type === filters.fileType);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal = a[filters.sortBy];
      let bVal = b[filters.sortBy];

      // Handle string comparison for filename
      if (filters.sortBy === 'original_filename') {
        aVal = aVal?.toLowerCase() || '';
        bVal = bVal?.toLowerCase() || '';
        return filters.sortOrder === 'desc'
          ? bVal.localeCompare(aVal)
          : aVal.localeCompare(bVal);
      }

      // Handle date comparison
      if (filters.sortBy === 'created_at') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }

      // Numeric comparison
      aVal = aVal || 0;
      bVal = bVal || 0;
      return filters.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return filtered;
  };

  const displayAds = getFilteredAds();

  // Stats
  const avgScore = ads.length > 0
    ? Math.round(ads.reduce((sum, ad) => sum + (ad.overall_score || 0), 0) / ads.length)
    : 0;
  const videoCount = ads.filter(ad => ad.file_type === 'video').length;
  const imageCount = ads.filter(ad => ad.file_type === 'image').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Header */}
      <div className="relative rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-purple-600/5 to-transparent p-8 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-600/10 rounded-full blur-2xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/30 rounded-xl blur-lg" />
              <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <FolderOpen className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Analyzed Ads
              </h1>
              <p className="text-muted-foreground mt-1">
                Browse and review analysis results for your advertisements
              </p>
            </div>
          </div>

          {/* Quick stats */}
          {ads.length > 0 && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-display font-bold text-foreground">{ads.length}</div>
                <div className="text-xs text-muted-foreground">Total Ads</div>
              </div>
              <div className="w-px h-10 bg-border/50" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <span className="text-2xl font-display font-bold text-foreground">{avgScore}</span>
                </div>
                <div className="text-xs text-muted-foreground">Avg Score</div>
              </div>
              <div className="w-px h-10 bg-border/50" />
              <div className="text-center">
                <div className="text-2xl font-display font-bold text-foreground">
                  {imageCount}/{videoCount}
                </div>
                <div className="text-xs text-muted-foreground">Images/Videos</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Filters */}
        <AdFilters filters={filters} onChange={setFilters} />

        {/* View controls */}
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className={cn(
              'p-2.5 rounded-xl',
              'bg-card/50 hover:bg-card border border-border/50',
              'text-muted-foreground hover:text-foreground',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/50'
            )}
            title="Refresh ads"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>

          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/50">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-all duration-200',
                viewMode === 'grid'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-lg transition-all duration-200',
                viewMode === 'list'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          </div>
          <p className="text-muted-foreground">Loading your ads...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Something went wrong</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">{error}</p>
          </div>
          <button
            onClick={() => loadAds()}
            className="mt-2 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : displayAds.length === 0 ? (
        <EmptyState hasAds={ads.length > 0} hasFilters={!!filters.search || filters.fileType !== 'all'} />
      ) : (
        <div className="animate-in fade-in duration-500">
          {viewMode === 'grid' ? (
            <AdGrid ads={displayAds} onSelect={handleSelectAd} />
          ) : (
            <AdList ads={displayAds} onSelect={handleSelectAd} />
          )}
        </div>
      )}

      {/* Results count */}
      {!loading && !error && displayAds.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {displayAds.length} of {ads.length} ads
        </div>
      )}

      {/* Detail Modal */}
      {selectedAdId && (
        <AdDetailModal
          ad={selectedAdDetails}
          loading={loadingDetails}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}

function EmptyState({ hasAds, hasFilters }) {
  return (
    <div className="relative rounded-2xl border border-border/50 bg-card/20 p-12 text-center overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="relative space-y-4">
        <div className="w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto">
          {hasFilters ? (
            <FolderOpen className="w-10 h-10 text-purple-400" />
          ) : (
            <Upload className="w-10 h-10 text-purple-400" />
          )}
        </div>

        <div>
          <h3 className="text-xl font-display font-bold text-foreground">
            {hasFilters ? 'No Matching Ads' : 'No Analyzed Ads Yet'}
          </h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            {hasFilters
              ? 'Try adjusting your search or filters to find the ads you\'re looking for.'
              : 'Upload and analyze your first advertisement to see detailed effectiveness results here.'}
          </p>
        </div>

        {!hasFilters && (
          <button className={cn(
            'inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-xl',
            'bg-gradient-to-r from-purple-500 to-purple-600',
            'text-white font-medium',
            'shadow-lg shadow-purple-500/25',
            'hover:shadow-xl hover:shadow-purple-500/30',
            'hover:from-purple-400 hover:to-purple-500',
            'transition-all duration-300'
          )}>
            <Upload className="w-4 h-4" />
            Upload Your First Ad
          </button>
        )}
      </div>
    </div>
  );
}

export default AdsPage;
