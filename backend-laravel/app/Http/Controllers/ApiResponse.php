<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\ResourceCollection;

/**
 * Shared helpers for the { data?: ... } / { error: { message, code, ... } }
 * response envelope used by every API controller.
 *
 * Mirrors the shape produced by the Next.js frontend's ok() / err() helpers
 * so the client can swap backends transparently.
 */
trait ApiResponse
{
    protected function ok(mixed $data = null, int $status = 200, array $headers = []): JsonResponse
    {
        $payload = $data === null ? ['data' => null] : ['data' => $data];
        return response()->json($payload, $status, $headers);
    }

    protected function created(mixed $data = null, int $status = 201, array $headers = []): JsonResponse
    {
        return $this->ok($data, $status, $headers);
    }

    protected function noContent(int $status = 204): JsonResponse
    {
        return response()->json(null, $status);
    }

    protected function err(string $message, int $status, string $code, array $extra = []): JsonResponse
    {
        $payload = [
            'error' => array_merge([
                'message' => $message,
                'code' => $code,
                'status' => $status,
            ], $extra),
        ];
        return response()->json($payload, $status);
    }

    protected function notFound(string $message = 'Not found.'): JsonResponse
    {
        return $this->err($message, 404, 'NOT_FOUND');
    }

    protected function forbidden(string $message = 'Forbidden.'): JsonResponse
    {
        return $this->err($message, 403, 'FORBIDDEN');
    }

    protected function unauthorized(string $message = 'Unauthenticated.'): JsonResponse
    {
        return $this->err($message, 401, 'UNAUTHENTICATED');
    }

    protected function tooManyRequests(int $retryAfter, string $message): JsonResponse
    {
        return $this->err($message, 429, 'RATE_LIMITED', ['retryAfter' => $retryAfter])
            ->withHeaders(['Retry-After' => (string) $retryAfter]);
    }

    protected function paginated($paginator, callable $map): JsonResponse
    {
        return $this->ok([
            'items' => array_map($map, $paginator->items()),
            'page' => $paginator->currentPage(),
            'pageSize' => $paginator->perPage(),
            'total' => $paginator->total(),
            'totalPages' => max(1, $paginator->lastPage()),
        ]);
    }

    protected function resource(JsonResource $resource, int $status = 200): JsonResponse
    {
        return $resource->response()->setStatusCode($status);
    }

    protected function parsePagination(\Illuminate\Http\Request $request, int $default = 15): array
    {
        $page = max(1, (int) $request->query('page', 1));
        $pageSize = min(100, max(1, (int) $request->query('pageSize', $default)));
        return ['page' => $page, 'pageSize' => $pageSize];
    }
}
