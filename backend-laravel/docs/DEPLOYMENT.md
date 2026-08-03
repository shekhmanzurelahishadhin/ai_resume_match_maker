# Deployment Guide — Resume Matchmaker Laravel Backend

This guide covers deploying the Laravel 12 backend to a production server
with MySQL 8, Redis 7, S3-compatible object storage, FCM push, queue
workers, and the cron scheduler.

---

## 1. System requirements

| Component | Version | Notes |
|-----------|---------|-------|
| PHP | 8.3+ | Required. Enable extensions: `pdo_mysql`, `mbstring`, `xml`, `ctype`, `json`, `bcmath`, `curl`, `gd`, `zip`, `redis` (optional via predis). |
| Composer | 2.7+ | |
| MySQL | 8.0+ | `utf8mb4` charset, `utf8mb4_unicode_ci` collation. |
| Redis | 7.2+ | Cache + sessions. |
| S3-compatible storage | AWS S3, MinIO, R2, etc. | Set `FILESYSTEM_DISK=s3`. |
| Supervisor | latest | Manages the queue worker process. |
| Cron | any | Runs Laravel's scheduler every minute. |
| Nginx / Caddy | latest | Reverse proxy + TLS termination. |

---

## 2. Install

```bash
git clone <repo> /var/www/resumematchmaker
cd /var/www/resumematchmaker/backend-laravel

composer install --no-dev --optimize-autoloader

cp .env.example .env
php artisan key:generate
```

Edit `.env`:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
SANCTUM_STATEFUL_DOMAINS=yourdomain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=resumematchmaker
DB_USERNAME=mm_app
DB_PASSWORD=<strong-password>

CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=database
FILESYSTEM_DISK=s3

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=<redis-password>

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=resumematchmaker

HUGGINGFACE_API_KEY=hf_...   # optional — empty = dictionary fallback
ADMIN_SECRET=<strong-secret> # required for /api/notifications/digest/run

FCM_PROJECT_ID=...
FCM_CLIENT_EMAIL=...
FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n

MAIL_MAILER=smtp
MAIL_HOST=smtp.yourprovider.com
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=noreply@yourdomain.com
```

---

## 3. Database

```bash
mysql -u root -p -e "CREATE DATABASE resumematchmaker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'mm_app'@'localhost' IDENTIFIED BY '<strong-password>'; GRANT ALL ON resumematchmaker.* TO 'mm_app'@'localhost'; FLUSH PRIVILEGES;"

php artisan migrate --force
php artisan db:seed --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

---

## 4. Queue worker (Supervisor)

Create `/etc/supervisor/conf.d/resumematchmaker-worker.conf`:

```ini
[program:resumematchmaker-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/resumematchmaker/backend-laravel/artisan queue:work database --sleep=3 --tries=3 --backoff=2,4,8 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/resumematchmaker/backend-laravel/storage/logs/worker.log
stopwaitsecs=3600
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start resumematchmaker-worker:*
```

Scale by increasing `numprocs`. The `database` queue driver supports
multiple workers concurrently (each picks a different row from the
`jobs` table via `FOR UPDATE SKIP LOCKED`).

---

## 5. Cron scheduler

Add to the system crontab (`crontab -e` as the web user):

```cron
* * * * * cd /var/www/resumematchmaker/backend-laravel && php artisan schedule:run >> /dev/null 2>&1
```

This runs the scheduler every minute. The scheduler dispatches:
- `notifications:send-daily-digest` at 09:00 daily.
- `users:purge-deleted` at 03:00 daily (30-day retention per §5).
- `ai:purge-cache` at 04:00 nightly.

---

## 6. Nginx / Caddy reverse proxy

### Nginx

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    root /var/www/resumematchmaker/backend-laravel/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* { deny all; }
}
```

### Caddy (automatic TLS)

```caddyfile
api.yourdomain.com {
    root * /var/www/resumematchmaker/backend-laravel/public
    php_fastcgi unix//var/run/php/php8.3-fpm.sock
    file_server
    try_files {path} {path}/ /index.php?{query}
}
```

---

## 7. Firebase Cloud Messaging

1. Create a Firebase project at <https://console.firebase.google.com>.
2. Add a Web App → copy the `FIREBASE_*` (public) values into `.env`.
3. Generate a Web Push VAPID key pair → `FIREBASE_VAPID_KEY`.
4. Project Settings → Service Accounts → "Generate new private key" →
   derive `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` (keep
   the literal `\n` sequences in the env value).
5. Restart the queue worker (`sudo supervisorctl restart resumematchmaker-worker:*`).

When FCM credentials are missing, `FirebaseService` is a graceful no-op —
push notifications are silently skipped while the in-app Notification row
still persists.

---

## 8. Health check + monitoring

`GET /api/health` returns:

```json
{
  "data": {
    "status": "ok",
    "timestamp": "2024-...",
    "service": "resume-matchmaker-laravel",
    "version": "1.0.0",
    "db": "ok",
    "cache": "ok"
  }
}
```

Returns 503 when the DB or cache is unreachable. Use this for:
- Docker / Kubernetes liveness + readiness probes.
- Load balancer health checks.
- Uptime monitoring (Pingdom, UptimeRobot, etc.).

---

## 9. Backups

- **Database:** nightly `mysqldump --single-transaction resumematchmaker | gzip > resumematchmaker-$(date +%F).sql.gz`.
- **S3:** enable versioning + cross-region replication on the bucket.
- **.env:** store in a secrets manager (Vault, AWS Secrets Manager, Doppler).

---

## 10. Updating

```bash
cd /var/www/resumematchmaker/backend-laravel
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache && php artisan event:cache
sudo supervisorctl restart resumematchmaker-worker:*
```

---

## 11. Docker (alternative)

A minimal `Dockerfile`:

```dockerfile
FROM php:8.3-fpm-alpine
RUN apk add --no-cache libzip-dev libpng-dev libxml2-dev oniguruma-dev && \
    docker-php-ext-install pdo_mysql zip gd mbstring xml bcmath
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www
COPY . .
RUN composer install --no-dev --optimize-autoloader && \
    php artisan config:clear
CMD ["php-fpm"]
```

Pair with a `docker-compose.yml` that includes MySQL 8, Redis 7, and
MinIO. The Next.js frontend can be added as another service or deployed
separately.
