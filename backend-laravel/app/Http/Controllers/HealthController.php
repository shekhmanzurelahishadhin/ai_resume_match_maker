<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HealthController extends Controller
{
    public function index(): JsonResponse
    {
        $checks = [
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
            'service' => 'resume-matchmaker-laravel',
            'version' => config('app.version', '1.0.0'),
        ];

        // DB check (non-fatal — degraded but alive).
        try {
            DB::select('SELECT 1');
            $checks['db'] = 'ok';
        } catch (\Throwable $e) {
            $checks['db'] = 'error';
            $checks['status'] = 'degraded';
            Log::error(json_encode(['level' => 'error', 'event' => 'health_db_failed', 'error' => $e->getMessage()]));
        }

        // Cache check (non-fatal).
        try {
            cache()->store(config('cache.default', 'file'))->put('__health_probe__', true, 5);
            cache()->store(config('cache.default', 'file'))->forget('__health_probe__');
            $checks['cache'] = 'ok';
        } catch (\Throwable $e) {
            $checks['cache'] = 'error';
            $checks['status'] = 'degraded';
        }

        $status = $checks['status'] === 'ok' ? 200 : 503;
        return response()->json(['data' => $checks], $status);
    }
}
