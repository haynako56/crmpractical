<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\WalkIn;
use Inertia\Inertia;

class DisplayHomeController extends Controller
{
    public function index()
    {
        $now = now();

        $walkIns = WalkIn::with(['repOnDuty', 'enquiry'])
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get();

        $users = User::orderBy('name')->get()->map(fn (User $user) => [
            'id'     => $user->id,
            'name'   => $user->name,
            'email'  => $user->email,
            'title'  => $user->title,
            'phone'  => $user->phone,
            'status' => $user->status,
            'color'  => $user->color ?? 0,
        ]);

        $rows = $walkIns->map(fn (WalkIn $walkIn) => $this->row($walkIn));

        $villages = collect(WalkIn::VILLAGES)->map(fn ($address, $name) => [
            'name'    => $name,
            'address' => $address,
            'stats'   => $this->villageStats($walkIns, $name, $now),
        ])->values();

        return Inertia::render('display-homes', [
            'walkIns'  => $rows->values(),
            'villages' => $villages,
            'users'    => $users,
            'visitorTypes' => WalkIn::VISITOR_TYPES,
            'stats'    => $this->overallStats($walkIns, $now),
        ]);
    }

    private function row(WalkIn $walkIn): array
    {
        return [
            'id'         => $walkIn->id,
            'date'       => $walkIn->date->format('Y-m-d'),
            'village'    => $walkIn->village,
            'visitors'   => $walkIn->visitors,
            'type'       => $walkIn->type,
            'notes'      => $walkIn->notes ?? '',
            'user_id'    => $walkIn->user_id,
            'repOnDuty'  => $walkIn->repOnDuty ? [
                'id'    => $walkIn->repOnDuty->id,
                'name'  => $walkIn->repOnDuty->name,
                'color' => $walkIn->repOnDuty->color ?? 0,
            ] : null,
            'enquiry'    => $walkIn->enquiry ? [
                'id'   => $walkIn->enquiry->id,
                'name' => $walkIn->enquiry->name,
            ] : null,
        ];
    }

    private function overallStats($walkIns, $now): array
    {
        $thisWeek  = $walkIns->filter(fn (WalkIn $w) => $w->date->gte($now->copy()->subDays(7)->startOfDay()));
        $thisMonth = $walkIns->filter(fn (WalkIn $w) => $w->date->isSameMonth($now) && $w->date->isSameYear($now));

        return [
            'total'            => $walkIns->count(),
            'thisWeek'         => $thisWeek->count(),
            'thisMonth'        => $thisMonth->count(),
            'visitorsThisMonth'=> $thisMonth->sum('visitors'),
            'converted'        => $walkIns->whereNotNull('enquiry_id')->count(),
        ];
    }

    private function villageStats($walkIns, string $village, $now): array
    {
        $forVillage = $walkIns->where('village', $village);
        $thisWeek   = $forVillage->filter(fn (WalkIn $w) => $w->date->gte($now->copy()->subDays(7)->startOfDay()));
        $thisMonth  = $forVillage->filter(fn (WalkIn $w) => $w->date->isSameMonth($now) && $w->date->isSameYear($now));

        return [
            'total'     => $forVillage->count(),
            'thisWeek'  => $thisWeek->count(),
            'thisMonth' => $thisMonth->count(),
            'visitors'  => $forVillage->sum('visitors'),
            'converted' => $forVillage->whereNotNull('enquiry_id')->count(),
        ];
    }
}
