"""
RQ Worker Entry Point
Listens for jobs from Redis queue and processes them
"""
import sys
import logging
from redis import Redis
from rq import Worker, Queue, Connection

from . import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('ad-analyzer-worker')

def run_worker():
    """Start the RQ worker"""
    redis_conn = config.get_redis_connection()

    # Define queues to listen to (priority order)
    queues = [
        Queue(config.QUEUE_AD_ANALYSIS, connection=redis_conn),
        Queue(config.QUEUE_EMOTION_ANALYSIS, connection=redis_conn),
    ]

    logger.info(f"""
╔════════════════════════════════════════════════════════════════╗
║           Ad Effectiveness Analyzer - Python Worker            ║
╠════════════════════════════════════════════════════════════════╣
║  Status:    Starting                                           ║
║  Redis:     {config.REDIS_URL:<48} ║
║  Queues:    {', '.join(q.name for q in queues):<48} ║
╚════════════════════════════════════════════════════════════════╝
    """)

    with Connection(redis_conn):
        worker = Worker(queues)
        worker.work(with_scheduler=True)

def main():
    """Entry point for the worker"""
    run_worker()

if __name__ == '__main__':
    main()
