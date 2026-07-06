<?php

namespace App\Http\Controllers;

use App\Models\Enquiry;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class LeadController extends Controller
{
    private const TERMINAL = ['Cold', 'Lost'];

    public function index()
    {
        $now    = now();
        $isSales = auth()->user()?->hasRole('Sales');
        $userId  = auth()->id();

        // ── Stats ────────────────────────────────────────────────────────────
        $noFollowupBase = Enquiry::whereNotIn('status', self::TERMINAL)
            ->whereDoesntHave('followUps')
            ->where(fn ($q) => $q->whereNull('fu')->orWhere('fu', ''));

        $baseQuery = Enquiry::query();
        if ($isSales) {
            $noFollowupBase->where('user_id', $userId);
            $baseQuery->where('user_id', $userId);
        }

        $stats = [
            'total'        => (clone $baseQuery)->count(),
            'newThisMonth' => (clone $baseQuery)->where('status', 'New')
                ->whereYear('date', $now->year)
                ->whereMonth('date', $now->month)
                ->count(),
            'hot'          => (clone $baseQuery)->where('status', 'Meeting')->count(),
            'needFollowup' => (clone $noFollowupBase)->count(),
            'lost'         => (clone $baseQuery)->where('status', 'Lost')->count(),
            'thisMonthLabel' => $now->format('F Y'),
        ];

        // ── Lead source breakdown ─────────────────────────────────────────────
        $sourceTotals = (clone $baseQuery)->selectRaw('source, COUNT(*) as count')
            ->whereNotNull('source')
            ->where('source', '!=', '')
            ->groupBy('source')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'source' => $row->source,
                'count'  => (int) $row->count,
            ]);

        // ── Active leads needing follow-up ────────────────────────────────────
        $needFollowup = (clone $noFollowupBase)
            ->with(['assignedUser', 'followUps.user'])
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->limit(20)
            ->get()
            ->map(fn (Enquiry $enquiry) => $this->row($enquiry));

        // ── Recent new leads ─────────────────────────────────────────────────
        $recentLeads = (clone $baseQuery)->with(['assignedUser', 'followUps.user'])
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->limit(20)
            ->get()
            ->map(fn (Enquiry $enquiry) => $this->row($enquiry));

        $users = User::orderBy('name')->get()->map(fn (User $user) => [
            'id'     => $user->id,
            'name'   => $user->name,
            'email'  => $user->email,
            'title'  => $user->title,
            'phone'  => $user->phone,
            'status' => $user->status,
            'color'  => $user->color ?? 0,
        ]);

        return Inertia::render('leads', [
            'stats'        => $stats,
            'sourceData'   => $sourceTotals->values(),
            'needFollowup' => $needFollowup->values(),
            'recentLeads'  => $recentLeads->values(),
            'users'        => $users,
        ]);
    }

    private function row(Enquiry $enquiry): array
    {
        return [
            'id'                    => $enquiry->id,
            'contactform7_id'       => $enquiry->contactform7_id ?? '',
            'cf7_status'            => $enquiry->cf7_status ?? '',
            'date'                  => $enquiry->date?->format('Y-m-d'),
            'name'                  => $enquiry->name,
            'phone'                 => $enquiry->phone ?? '',
            'email'                 => $enquiry->email ?? '',
            'postcode'              => $enquiry->postcode ?? '',
            'source'                => $enquiry->source ?? '',
            'where_did_you_hear'    => $enquiry->where_did_you_hear ?? '',
            'lead'                  => $enquiry->lead ?? '',
            'type'                  => $enquiry->type ?? '',
            'interested'            => $enquiry->interested ?? '',
            'loc'                   => $enquiry->loc ?? '',
            'rep'                   => $enquiry->rep ?? '',
            'status'                => $enquiry->status,
            'dep1'                  => $enquiry->dep1 ?? 'NO',
            'dep1_date'             => $enquiry->dep1_date?->format('Y-m-d'),
            'dep2'                  => $enquiry->dep2 ?? 'NO',
            'dep2_date'             => $enquiry->dep2_date?->format('Y-m-d'),
            'notes'                 => $enquiry->notes ?? '',
            'design_name'           => $enquiry->design_name ?? '',
            'alt_s'                 => $enquiry->alt_s ?? '',
            'ajxizl7033'            => $enquiry->ajxizl7033 ?? '',
            'message'               => $enquiry->message ?? '',
            'join_email_list'       => (bool) $enquiry->join_email_list,
            'fu'                    => $enquiry->fu ?? '',
            'firstContactTimestamp' => $enquiry->first_contact_timestamp?->toISOString(),
            'files'                 => $enquiry->files ?? [],
            'files_count'           => $enquiry->files_count ?? 0,
            'user_id'               => $enquiry->user_id,
            'assignedUser'          => $enquiry->assignedUser ? [
                'id'     => $enquiry->assignedUser->id,
                'name'   => $enquiry->assignedUser->name,
                'email'  => $enquiry->assignedUser->email,
                'title'  => $enquiry->assignedUser->title,
                'phone'  => $enquiry->assignedUser->phone,
                'status' => $enquiry->assignedUser->status,
                'color'  => $enquiry->assignedUser->color ?? 0,
            ] : null,
            'followUps'             => $enquiry->followUps->map(fn ($fu) => [
                'id'        => $fu->id,
                'date'      => $fu->date?->format('Y-m-d'),
                'message'   => $fu->message,
                'file_name' => $fu->file_name,
                'file_size' => $fu->file_size,
                'file_mime' => $fu->file_mime,
                'user_name' => $fu->user?->name,
            ]),
        ];
    }
}
