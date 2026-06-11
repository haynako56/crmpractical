<?php

namespace App\Http\Middleware;

use App\Models\Enquiry;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    private function alertCount(): int
    {
        return Enquiry::whereNotIn('status', ['1st Deposit', '2nd Deposit', 'Closed', 'Lost'])
            ->whereNotNull('first_contact_timestamp')
            ->where('first_contact_timestamp', '<=', now()->subHours(4))
            ->whereDoesntHave('followUps')
            ->where(fn ($q) => $q->whereNull('fu')->orWhere('fu', ''))
            ->count();
    }

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user'         => $request->user(),
                'isSuperAdmin' => $request->user()?->hasRole('Super Admin') ?? false,
            ],
            'alertCount'  => $request->user() ? $this->alertCount() : 0,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash'       => $request->session()->get('flash'),
        ];
    }
}
