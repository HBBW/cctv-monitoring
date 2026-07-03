#!/usr/bin/env sh
set -e

cd /var/www/html

if [ ! -f .env ]; then
  cp .env.example .env
fi

set_env_value() {
  key="$1"
  value="$2"

  if [ -z "$value" ]; then
    return
  fi

  escaped_value=$(printf '%s' "$value" | sed 's/[\/&]/\\&/g')

  if grep -q "^${key}=" .env; then
    sed -i "s/^${key}=.*/${key}=${escaped_value}/" .env
  else
    printf '\n%s=%s\n' "$key" "$value" >> .env
  fi
}

set_env_value APP_ENV "${APP_ENV:-production}"
set_env_value APP_DEBUG "${APP_DEBUG:-false}"
set_env_value APP_URL "${APP_URL:-http://localhost:8010}"
set_env_value FRONTEND_URL "${FRONTEND_URL:-http://localhost:3010}"
set_env_value DB_CONNECTION "${DB_CONNECTION:-mysql}"
set_env_value DB_HOST "${DB_HOST:-mysql}"
set_env_value DB_PORT "${DB_PORT:-3306}"
set_env_value DB_DATABASE "${DB_DATABASE:-cctv_exception_monitoring}"
set_env_value DB_USERNAME "${DB_USERNAME:-cctv}"
set_env_value DB_PASSWORD "${DB_PASSWORD:-cctv}"
set_env_value SESSION_DRIVER "${SESSION_DRIVER:-database}"
set_env_value CACHE_STORE "${CACHE_STORE:-database}"
set_env_value QUEUE_CONNECTION "${QUEUE_CONNECTION:-database}"
set_env_value FILESYSTEM_DISK "${FILESYSTEM_DISK:-public}"

if [ ! -d vendor ]; then
  composer install --no-interaction --prefer-dist
fi

php -r '
$host = getenv("DB_HOST") ?: "mysql";
$port = (int) (getenv("DB_PORT") ?: 3306);
$deadline = time() + 60;
do {
    $connection = @fsockopen($host, $port);
    if ($connection) {
        fclose($connection);
        exit(0);
    }
    sleep(1);
} while (time() < $deadline);
fwrite(STDERR, "Database is not reachable.\n");
exit(1);
'

if [ -z "$APP_KEY" ] && ! grep -q '^APP_KEY=base64:' .env 2>/dev/null; then
  php artisan key:generate --force
fi

php artisan config:clear
php artisan cache:clear || true
php artisan storage:link || true
php artisan migrate --seed --force

php artisan serve --host=0.0.0.0 --port=8000
