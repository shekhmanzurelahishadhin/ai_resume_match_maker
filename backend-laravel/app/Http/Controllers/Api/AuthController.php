<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Resources\UserResource;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    use ApiResponse;

    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();
        $email = strtolower(trim($data['email']));

        if (User::where('email', $email)->exists()) {
            return $this->err('Email already registered', 409, 'EMAIL_TAKEN');
        }

        $user = DB::transaction(function () use ($data, $email) {
            $user = User::create([
                'name' => trim($data['name']),
                'email' => $email,
                'password_hash' => Hash::make($data['password']),
                'role' => $data['role'],
            ]);
            NotificationPreference::create(array_merge(
                ['user_id' => $user->id],
                NotificationPreference::defaults()
            ));
            return $user;
        });

        $token = $user->createToken('auth-token')->plainTextToken;

        return $this->created([
            'user' => UserResource::make($user),
            'token' => $token,
        ]);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();
        $email = strtolower(trim($data['email']));

        /** @var User|null $user */
        $user = User::where('email', $email)->first();
        if (! $user || ! Hash::check($data['password'], $user->password_hash)) {
            return $this->err('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return $this->ok([
            'user' => UserResource::make($user),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();
        return $this->ok(null);
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $data = $request->validated();
        $email = strtolower(trim($data['email']));

        // We use Laravel's password broker (stores tokens in password_reset_tokens).
        $broker = Password::broker();
        $status = $broker->sendResetLink(['email' => $email]);

        // In dev (no SMTP), surface the token in `devOnly` so it can be tested.
        $devOnly = null;
        if (app()->environment('local', 'testing') || ! config('mail.mailers.smtp.host')) {
            $user = User::where('email', $email)->first();
            if ($user) {
                $token = Str::random(32);
                DB::table('password_reset_tokens')->updateOrInsert(
                    ['email' => $email],
                    ['token' => $token, 'created_at' => now()],
                );
                $devOnly = ['token' => $token, 'expiresIn' => '1 hour'];
            }
        }

        $ok = $status === Password::RESET_LINK_SENT || $status === Password::RESET_THROTTLED;
        return $this->ok([
            'status' => $ok ? 'sent' : 'failed',
            'devOnly' => $devOnly,
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $data = $request->validated();

        $status = Password::broker()->reset([
            'email' => strtolower(trim($data['email'])),
            'token' => $data['token'],
            'password' => $data['password'],
        ], function (User $user, string $password) {
            $user->password_hash = Hash::make($password);
            $user->save();
        });

        if ($status !== Password::PASSWORD_RESET) {
            return $this->err('Password reset failed', 400, 'RESET_FAILED', ['broker_status' => $status]);
        }

        return $this->ok(['status' => 'reset']);
    }
}
