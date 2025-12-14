import { useState, useEffect } from 'react';
import { trainingApi } from '../../lib/api';
import { cn } from '../../lib/utils';
import {
  Database, RefreshCw, Trash2, ChevronDown, ChevronUp,
  Calendar, Film, BarChart3, Loader2, AlertCircle
} from 'lucide-react';

function RatingBadge({ value }) {
  const getColor = (val) => {
    if (val <= 3) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (val <= 5) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (val <= 7) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  };

  return (
    <span className={cn(
      'inline-flex px-2 py-0.5 rounded text-xs font-medium border',
      getColor(value)
    )}>
      {value}
    </span>
  );
}

function EntryRow({ entry, onDelete, isExpanded, onToggle }) {
  const ratings = entry.ratings || {};
  const avgRating = Object.values(ratings).length > 0
    ? (Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).length).toFixed(1)
    : 'N/A';

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <tr
        className={cn(
          'border-b border-border/50 hover:bg-card/50 transition-colors cursor-pointer',
          isExpanded && 'bg-card/30'
        )}
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm text-foreground font-medium truncate max-w-[150px]">
              {entry.ad_filename || `Ad #${entry.ad_id}`}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <RatingBadge value={avgRating} />
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {formatDate(entry.created_at)}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </td>
      </tr>

      {/* Expanded details */}
      {isExpanded && (
        <tr className="bg-card/20">
          <td colSpan={4} className="px-4 py-4">
            <div className="space-y-4">
              {/* Rating breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(ratings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-xs text-muted-foreground capitalize">
                      {key.replace('_', ' ')}
                    </span>
                    <RatingBadge value={value} />
                  </div>
                ))}
              </div>

              {/* Notes */}
              {entry.notes && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-foreground">{entry.notes}</p>
                </div>
              )}

              {/* Improvement feedback */}
              {entry.improvement_feedback && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Improvement Suggestions</p>
                  <p className="text-sm text-foreground">{entry.improvement_feedback}</p>
                </div>
              )}

              {/* Emotion summary */}
              {entry.emotion_summary && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Dominant: </span>
                    <span className="text-foreground font-medium capitalize">
                      {entry.emotion_summary.dominant_emotion || 'Unknown'}
                    </span>
                    <span className="text-muted-foreground"> • Engagement: </span>
                    <span className="text-foreground font-medium">
                      {((entry.emotion_summary.avg_engagement || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function TrainingDataTable({ refreshTrigger }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadEntries();
  }, [refreshTrigger]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await trainingApi.list(50, 0);
      setEntries(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this training entry?')) return;

    try {
      await trainingApi.delete(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-400" />
          <h3 className="font-medium text-foreground">Training Data</h3>
          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
            {entries.length} entries
          </span>
        </div>
        <button
          onClick={loadEntries}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center gap-2 py-12 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <Database className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No training data yet</p>
          <p className="text-muted-foreground text-xs mt-1">
            Analyze reactions and submit ratings to build your training dataset
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Film className="w-3 h-3" />
                    Ad
                  </div>
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    Avg
                  </div>
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Date
                  </div>
                </th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onDelete={handleDelete}
                  isExpanded={expandedId === entry.id}
                  onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TrainingDataTable;
