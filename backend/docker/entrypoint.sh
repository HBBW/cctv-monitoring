#!/usr/bin/env sh
set -e

cd /var/www/html

if [ ! -f .env ]; then
  cp .env.example .env
fi

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

php artisan storage:link || true
php artisan migrate --seed --force

php artisan serve --host=0.0.0.0 --port=8000
