<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GeneratedResumeController;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\MatchController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ResumeController;
use App\Http\Controllers\Api\TemplateController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Resume Matchmaker (§9 of spec)
|--------------------------------------------------------------------------
| Every endpoint from the Next.js /api/** tree is mirrored 1:1 here.
| Authenticated routes use Sanctum (bearer token or session cookie).
*/

// --- Health & root ---
Route::get('health', [HealthController::class, 'index']);
Route::get('/', [HealthController::class, 'index']);

// --- Auth (Phase 1) ---
Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);
Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('reset-password', [AuthController::class, 'resetPassword']);

// --- Public: Firebase client config (served to browser, no secrets) ---
Route::get('notifications/firebase-config', [NotificationController::class, 'firebaseConfig']);

// --- Authenticated routes ---
Route::middleware('auth:sanctum')->group(function () {

    // Auth: logout
    Route::post('logout', [AuthController::class, 'logout']);

    // Current user (profile, GDPR export, account deletion)
    Route::get('user', [UserController::class, 'show']);
    Route::get('users/me', [UserController::class, 'show']);
    Route::patch('users/me', [UserController::class, 'update']);
    Route::delete('users/me', [UserController::class, 'destroy']);
    Route::post('users/export-data', [UserController::class, 'exportData']);

    // Resumes (seeker-only upload; owner-scoped everything else)
    Route::get('resumes', [ResumeController::class, 'index']);
    Route::post('resumes/upload', [ResumeController::class, 'upload'])
        ->middleware(['role:seeker', 'throttle.uploads']);
    Route::get('resumes/{resume}', [ResumeController::class, 'show']);
    Route::delete('resumes/{resume}', [ResumeController::class, 'destroy']);
    Route::get('resumes/{resume}/status', [ResumeController::class, 'status']);
    Route::get('resumes/{resume}/matches', [ResumeController::class, 'matches']);
    Route::post('resumes/{resume}/analyze', [ResumeController::class, 'analyze']);

    // Jobs (recruiters create; seekers list active; owner edits)
    Route::get('jobs', [JobController::class, 'index']);
    Route::post('jobs', [JobController::class, 'store'])->middleware('role:recruiter');
    Route::get('jobs/{job}', [JobController::class, 'show']);
    Route::put('jobs/{job}', [JobController::class, 'update'])->middleware('role:recruiter');
    Route::patch('jobs/{job}', [JobController::class, 'update'])->middleware('role:recruiter');
    Route::delete('jobs/{job}', [JobController::class, 'destroy'])->middleware('role:recruiter');
    Route::get('jobs/{job}/candidates', [JobController::class, 'candidates'])
        ->middleware('role:recruiter');

    // Matches
    Route::get('matches/{match}', [MatchController::class, 'show']);
    Route::get('matches/resume/{resume}', [MatchController::class, 'byResume']);
    Route::get('matches/job/{job}', [MatchController::class, 'byJob'])->middleware('role:recruiter');

    // Templates
    Route::get('templates', [TemplateController::class, 'index']);
    Route::get('templates/{slug}', [TemplateController::class, 'show']);

    // Generated resumes (Phase 2 builder)
    Route::get('resumes/generate', [GeneratedResumeController::class, 'index']);
    Route::post('resumes/generate', [GeneratedResumeController::class, 'store'])
        ->middleware('throttle.generations');
    Route::get('resumes/generate/{generatedResume}', [GeneratedResumeController::class, 'show']);
    Route::put('resumes/generate/{generatedResume}', [GeneratedResumeController::class, 'update']);
    Route::patch('resumes/generate/{generatedResume}', [GeneratedResumeController::class, 'update']);
    Route::delete('resumes/generate/{generatedResume}', [GeneratedResumeController::class, 'destroy']);
    Route::get('resumes/generate/{generatedResume}/preview', [GeneratedResumeController::class, 'preview']);
    Route::post('resumes/generate/{generatedResume}/export', [GeneratedResumeController::class, 'export']);
    Route::post('resumes/generate/{generatedResume}/tailor', [GeneratedResumeController::class, 'tailor'])
        ->middleware('throttle.generations');
    Route::post('resumes/generate/{generatedResume}/enhance', [GeneratedResumeController::class, 'enhance'])
        ->middleware('throttle.generations');
    Route::get('resumes/generate/{generatedResume}/versions', [GeneratedResumeController::class, 'versions']);
    Route::post('resumes/generate/{generatedResume}/versions/{version}/restore', [GeneratedResumeController::class, 'restore']);

    // Notifications (Phase 3)
    Route::post('notifications/register-device', [NotificationController::class, 'registerDevice']);
    Route::delete('notifications/device/{token}', [NotificationController::class, 'deleteDevice']);
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::put('notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::put('notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::get('notifications/preferences', [NotificationController::class, 'preferences']);
    Route::put('notifications/preferences', [NotificationController::class, 'updatePreferences']);
});

// Admin-only: manually trigger the daily digest.
Route::post('notifications/digest/run', [NotificationController::class, 'digestRun'])
    ->middleware('admin.secret');
