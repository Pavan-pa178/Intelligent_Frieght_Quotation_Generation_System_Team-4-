web: cd backend && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT --workers 1 --threads 2 --worker-class gthread --max-requests 200 --max-requests-jitter 50 --timeout 30 --keep-alive 2

