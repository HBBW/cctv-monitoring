<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (! $request->user()?->hasRole($roles)) {
            return response()->json(['message' => 'Akses tidak diizinkan untuk peran pengguna ini.'], 403);
        }

        return $next($request);
    }
}
