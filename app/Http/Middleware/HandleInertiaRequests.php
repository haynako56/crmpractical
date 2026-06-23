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
        $query = Enquiry::where('status', 'New')
            ->whereNotNull('first_contact_timestamp')
            ->where('first_contact_timestamp', '<=', now()->subHours(4))
            ->whereDoesntHave('followUps')
            ->where(fn ($q) => $q->whereNull('fu')->orWhere('fu', ''));

        if (auth()->user()?->hasRole('Sales')) {
            $query->where('user_id', auth()->id());
        }

        return $query->count();
    }

    private function alertNotifications(): array
    {
        $now          = now();
        $threshold4h  = $now->copy()->subHours(4);
        $threshold24h = $now->copy()->subHours(24);

        $query = Enquiry::where('status', 'New')
            ->whereNotNull('first_contact_timestamp')
            ->where('first_contact_timestamp', '<=', $threshold4h)
            ->whereDoesntHave('followUps')
            ->where(fn ($q) => $q->whereNull('fu')->orWhere('fu', ''))
            ->with('assignedUser:id,name')
            ->orderBy('first_contact_timestamp')
            ->limit(20);

        if (auth()->user()?->hasRole('Sales')) {
            $query->where('user_id', auth()->id());
        }

        return $query->get()->map(function ($enquiry) use ($now, $threshold24h) {
            $ts    = $enquiry->first_contact_timestamp;
            $level = $ts->lte($threshold24h) ? 'urgent' : 'warning';
            $diff  = abs($now->diffInSeconds($ts));

            if ($diff < 3600)      $elapsed = floor($diff / 60) . 'm ago';
            elseif ($diff < 86400) $elapsed = floor($diff / 3600) . 'h ago';
            else                   $elapsed = floor($diff / 86400) . 'd ago';

            return [
                'id'      => $enquiry->id,
                'level'   => $level,
                'rep'     => $enquiry->assignedUser?->name ?? '',
                'name'    => $enquiry->name,
                'type'    => $enquiry->type ?? '',
                'loc'     => $enquiry->loc ?? '',
                'elapsed' => $elapsed,
            ];
        })->toArray();
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
                'isAdmin'      => $request->user()?->hasRole('Admin') ?? false,
            ],
            'alertCount'         => $request->user() ? $this->alertCount() : 0,
            'alertNotifications' => $request->user() ? $this->alertNotifications() : [],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash'       => $request->session()->get('flash'),
        ];
    }
}
