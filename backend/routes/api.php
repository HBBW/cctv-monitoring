<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CheckController;
use App\Http\Controllers\Api\CctvController;
use App\Http\Controllers\Api\IssueController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/cctvs', [CctvController::class, 'index']);
    Route::get('/cctvs/{cctv}', [CctvController::class, 'show']);
    Route::middleware('role:admin')->group(function () {
        Route::post('/cctvs', [CctvController::class, 'store']);
        Route::match(['put', 'patch'], '/cctvs/{cctv}', [CctvController::class, 'update']);
        Route::delete('/cctvs/{cctv}', [CctvController::class, 'destroy']);

        Route::apiResource('users', UserController::class);
    });

    Route::get('/issues', [IssueController::class, 'index']);
    Route::get('/issues/{issue}', [IssueController::class, 'show']);
    Route::get('/checks', [CheckController::class, 'index']);
    Route::get('/checks/{check}', [CheckController::class, 'show']);
    Route::middleware('role:admin,petugas')->group(function () {
        Route::post('/issues', [IssueController::class, 'store']);
        Route::patch('/issues/{issue}/resolve', [IssueController::class, 'resolve']);
        Route::post('/checks', [CheckController::class, 'store']);
    });

    Route::get('/reports/daily', [ReportController::class, 'daily']);
    Route::get('/reports/daily.csv', [ReportController::class, 'csv']);
    Route::get('/reports/daily.pdf', [ReportController::class, 'pdf']);
    Route::get('/reports/monthly', [ReportController::class, 'monthly']);
    Route::get('/reports/monthly.csv', [ReportController::class, 'monthlyCsv']);
    Route::get('/reports/monthly.pdf', [ReportController::class, 'monthlyPdf']);
});
