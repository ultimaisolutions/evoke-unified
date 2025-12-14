#!/bin/bash
set -e

# Set Python path
export PYTHONPATH=/app/src:$PYTHONPATH

# Run the worker
exec python -c "
from src.worker import main
main()
"
