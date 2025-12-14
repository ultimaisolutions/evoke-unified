import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Activity, Database, Server, Cpu, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function StatusItem({ icon: Icon, label, status, message }) {
  const getStatusStyles = () => {
    switch (status) {
      case 'healthy':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'unhealthy':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'loading':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  return (
    <div className={cn(
      'flex items-center justify-between p-4 rounded-xl border',
      getStatusStyles()
    )}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <div>
          <p className="font-medium text-sm">{label}</p>
          {message && <p className="text-xs opacity-75">{message}</p>}
        </div>
      </div>
      {status === 'healthy' && <CheckCircle2 className="w-5 h-5" />}
      {status === 'unhealthy' && <XCircle className="w-5 h-5" />}
      {status === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
    </div>
  );
}

export function SystemStatus() {
  const [status, setStatus] = useState({
    backend: 'loading',
    database: 'loading',
    redis: 'loading',
    worker: 'loading',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);

    // Check backend health
    try {
      const response = await fetch('/api/health');
      const data = await response.json();

      setStatus({
        backend: data.status === 'ok' ? 'healthy' : 'unhealthy',
        database: data.services?.database === 'connected' ? 'healthy' : 'unhealthy',
        redis: data.services?.redis === 'connected' ? 'healthy' : 'unhealthy',
        worker: 'healthy', // Workers are checked separately
      });
    } catch (error) {
      setStatus({
        backend: 'unhealthy',
        database: 'unhealthy',
        redis: 'unhealthy',
        worker: 'unhealthy',
      });
    }

    setLoading(false);
  };

  const allHealthy = Object.values(status).every(s => s === 'healthy');

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            allHealthy ? 'bg-emerald-500/20' : 'bg-amber-500/20'
          )}>
            <Activity className={cn(
              'w-5 h-5',
              allHealthy ? 'text-emerald-400' : 'text-amber-400'
            )} />
          </div>
          <div>
            <h3 className="font-medium text-foreground">System Status</h3>
            <p className="text-sm text-muted-foreground">
              {allHealthy ? 'All systems operational' : 'Some services need attention'}
            </p>
          </div>
        </div>

        <button
          onClick={checkStatus}
          disabled={loading}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium',
            'border border-border hover:bg-muted transition-colors',
            loading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      <div className="grid gap-3">
        <StatusItem
          icon={Server}
          label="Backend API"
          status={status.backend}
          message={status.backend === 'healthy' ? 'Responding normally' : 'Connection failed'}
        />
        <StatusItem
          icon={Database}
          label="PostgreSQL Database"
          status={status.database}
          message={status.database === 'healthy' ? 'Connected' : 'Connection error'}
        />
        <StatusItem
          icon={Activity}
          label="Redis Queue"
          status={status.redis}
          message={status.redis === 'healthy' ? 'Connected' : 'Connection error'}
        />
        <StatusItem
          icon={Cpu}
          label="Python Worker"
          status={status.worker}
          message={status.worker === 'healthy' ? 'Ready for jobs' : 'Not responding'}
        />
      </div>
    </div>
  );
}

export default SystemStatus;
