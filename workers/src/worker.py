"""
Custom Worker - Polls Redis lists for raw JSON jobs from Node.js backend

The Node.js backend pushes raw JSON to Redis lists (rq:queue:*).
This worker polls those lists directly instead of using RQ's job format.
"""
import sys
import json
import logging
import traceback
import time

from . import config
from .tasks.ad_analysis_task import analyze_ad
from .tasks.emotion_analysis_task import analyze_emotion

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
    """Poll Redis queues for jobs"""
    redis_conn = config.get_redis_connection()

    # Map queue names to handler functions
    queue_handlers = {
        config.QUEUE_AD_ANALYSIS: analyze_ad,
        config.QUEUE_EMOTION_ANALYSIS: analyze_emotion,
    }

    # Build list of Redis keys to poll
    queue_keys = [f'rq:queue:{name}' for name in queue_handlers.keys()]

    logger.info(f"""
╔════════════════════════════════════════════════════════════════╗
║           Ad Effectiveness Analyzer - Python Worker            ║
╠════════════════════════════════════════════════════════════════╣
║  Status:    Running                                            ║
║  Redis:     {config.REDIS_URL:<48} ║
║  Queues:    {', '.join(queue_handlers.keys()):<48} ║
║  Mode:      Custom polling (raw JSON from Node.js)             ║
╚════════════════════════════════════════════════════════════════╝
    """)

    logger.info(f"Polling queues: {queue_keys}")

    while True:
        try:
            # BRPOP blocks until a job is available (with 5 second timeout)
            # This is more efficient than polling in a tight loop
            result = redis_conn.brpop(queue_keys, timeout=5)

            if result:
                queue_key, job_data_bytes = result
                queue_key = queue_key.decode() if isinstance(queue_key, bytes) else queue_key
                job_data_str = job_data_bytes.decode() if isinstance(job_data_bytes, bytes) else job_data_bytes

                # Extract queue name from key (rq:queue:ad_analysis -> ad_analysis)
                queue_name = queue_key.replace('rq:queue:', '')

                logger.info(f"Received job from queue: {queue_name}")

                try:
                    job_data = json.loads(job_data_str)
                    job_id = job_data.get('job_id', 'unknown')
                    logger.info(f"Processing job {job_id}: {json.dumps(job_data, indent=2)}")

                    # Get the handler for this queue
                    handler = queue_handlers.get(queue_name)
                    if handler:
                        handler(job_data)
                        logger.info(f"Job {job_id} completed successfully")
                    else:
                        logger.error(f"No handler for queue: {queue_name}")

                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse job data: {e}")
                    logger.error(f"Raw data: {job_data_str}")
                except Exception as e:
                    logger.error(f"Job processing failed: {e}")
                    logger.error(traceback.format_exc())

        except KeyboardInterrupt:
            logger.info("Worker shutting down...")
            break
        except Exception as e:
            logger.error(f"Worker error: {e}")
            logger.error(traceback.format_exc())
            # Brief pause before retrying on connection errors
            time.sleep(1)


def main():
    """Entry point for the worker"""
    run_worker()


if __name__ == '__main__':
    main()
