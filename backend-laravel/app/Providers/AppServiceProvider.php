<?php

namespace App\Providers;

use App\Services\CacheService;
use App\Services\FirebaseService;
use App\Services\HuggingFaceService;
use App\Services\MatchService;
use App\Services\NotificationService;
use App\Services\PdfParserService;
use App\Services\RateLimitService;
use App\Services\ResumeTemplateRenderer;
use App\Services\StorageService;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter as RateLimiterFacade;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(HuggingFaceService::class, function ($app) {
            return new HuggingFaceService(client: null, cache: $app->make(CacheService::class));
        });
        $this->app->singleton(CacheService::class);
        $this->app->singleton(StorageService::class);
        $this->app->singleton(PdfParserService::class);
        $this->app->singleton(ResumeTemplateRenderer::class);
        $this->app->singleton(FirebaseService::class);
        $this->app->singleton(RateLimitService::class);

        $this->app->singleton(MatchService::class, function ($app) {
            return new MatchService(
                $app->make(HuggingFaceService::class),
                $app->make(NotificationService::class),
            );
        });
        $this->app->singleton(NotificationService::class, function ($app) {
            return new NotificationService($app->make(FirebaseService::class));
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // §8 rate limiters — used by `throttle:api`, `throttle:uploads`,
        // `throttle:generations` middleware (and our custom middleware aliases).
        RateLimiterFacade::for('api', function (Request $request) {
            $cfg = config('rate-limit.api');
            $key = $request->user()?->id ?: $request->ip();
            return \Illuminate\Cache\Limit::perMinute($cfg['max'])->by($key);
        });

        RateLimiterFacade::for('uploads', function (Request $request) {
            $cfg = config('rate-limit.resume_upload');
            return \Illuminate\Cache\Limit::perHour($cfg['max'])->by($request->user()?->id ?: $request->ip());
        });

        RateLimiterFacade::for('generations', function (Request $request) {
            $cfg = config('rate-limit.resume_generate');
            return \Illuminate\Cache\Limit::perHour($cfg['max'])->by($request->user()?->id ?: $request->ip());
        });
    }
}
