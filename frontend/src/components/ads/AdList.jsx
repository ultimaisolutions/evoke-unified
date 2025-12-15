import { Image, Film, ChevronRight } from 'lucide-react';
import { cn, getScoreClass } from '../../lib/utils';

export function AdList({ ads, onSelect }) {
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Ad
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
              Type
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
              Overall
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground hidden md:table-cell">
              Visual
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground hidden md:table-cell">
              Clarity
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground hidden lg:table-cell">
              Attention
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">
              Date
            </th>
            <th className="px-4 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {ads.map((ad) => (
            <tr
              key={ad.id}
              onClick={() => onSelect(ad.id)}
              className={cn(
                'border-b border-border/50 hover:bg-card/50',
                'transition-colors cursor-pointer group'
              )}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    {ad.file_type === 'video' ? (
                      <Film className="w-5 h-5 text-purple-400" />
                    ) : (
                      <Image className="w-5 h-5 text-purple-400" />
                    )}
                  </div>
                  <span className="font-medium text-foreground truncate max-w-[200px] group-hover:text-purple-400 transition-colors">
                    {ad.original_filename}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-xs text-muted-foreground capitalize">
                  {ad.file_type}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={cn(
                  'inline-block px-2.5 py-1 rounded-lg text-sm font-bold border',
                  getScoreClass(ad.overall_score || 0)
                )}>
                  {Math.round(ad.overall_score || 0)}
                </span>
              </td>
              <td className="px-4 py-3 text-center hidden md:table-cell">
                <span className="text-sm text-foreground">
                  {Math.round(ad.visual_appeal_score || 0)}
                </span>
              </td>
              <td className="px-4 py-3 text-center hidden md:table-cell">
                <span className="text-sm text-foreground">
                  {Math.round(ad.clarity_score || 0)}
                </span>
              </td>
              <td className="px-4 py-3 text-center hidden lg:table-cell">
                <span className="text-sm text-foreground">
                  {Math.round(ad.attention_grab_score || 0)}
                </span>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <span className="text-xs text-muted-foreground">
                  {formatDate(ad.created_at)}
                </span>
              </td>
              <td className="px-4 py-3">
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdList;
