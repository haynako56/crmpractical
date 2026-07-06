<?php

namespace App\Http\Controllers;

use App\Models\Enquiry;
use App\Models\User;
use Illuminate\Support\Collection;
use Inertia\Inertia;

class AlertController extends Controller
{
    private const TERMINAL = ['1st Deposit', '2nd Deposit', 'Cold', 'Lost'];

    public function index()
    {
        $activeQuery = Enquiry::whereNotIn('status', self::TERMINAL)
            ->whereNotNull('first_contact_timestamp')
            ->with(['assignedUser', 'followUps.user'])
            ->orderBy('first_contact_timestamp');

        if (auth()->user()?->hasRole('Sales')) {
            $activeQuery->where('user_id', auth()->id());
        }

        $active = $activeQuery->get();

        $now       = now();
        $threshold4h  = $now->copy()->subHours(4);
        $threshold24h = $now->copy()->subHours(24);

        $urgent  = collect();
        $warning = collect();
        $ok      = collect();

        foreach ($active as $enquiry) {
            $hasResponse = $enquiry->status !== 'New'
                || $enquiry->followUps->isNotEmpty()
                || ! empty($enquiry->fu);
            $ts          = $enquiry->first_contact_timestamp;

            if ($hasResponse || $ts->gt($threshold4h)) {
                $ok->push($this->row($enquiry, $now));
            } elseif ($ts->lte($threshold24h)) {
                $urgent->push($this->row($enquiry, $now));
            } else {
                $warning->push($this->row($enquiry, $now));
            }
        }

        $users = User::orderBy('name')->get()->map(fn (User $user) => [
            'id'     => $user->id,
            'name'   => $user->name,
            'email'  => $user->email,
            'title'  => $user->title,
            'phone'  => $user->phone,
            'status' => $user->status,
            'color'  => $user->color ?? 0,
        ]);

        return Inertia::render('alerts', [
            'urgent'  => $urgent->values(),
            'warning' => $warning->values(),
            'ok'      => $ok->values(),
            'stats'   => [
                'urgent'  => $urgent->count(),
                'warning' => $warning->count(),
                'ok'      => $ok->count(),
                'total'   => $urgent->count() + $warning->count() + $ok->count(),
            ],
            'users' => $users,
        ]);
    }

    private function row(Enquiry $enquiry, \Carbon\CarbonInterface $now): array
    {
        $ts = $enquiry->first_contact_timestamp;

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
            'firstContactTimestamp' => $ts?->toISOString(),
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
            'elapsed'               => $this->fmtElapsed($now->diffInSeconds($ts, false)),
            'hasNotes'              => $enquiry->followUps->isNotEmpty() || ! empty($enquiry->fu),
        ];
    }

    private function fmtElapsed(int $diffSeconds): string
    {
        $absDiff = abs($diffSeconds);
        if ($absDiff < 3600)  return floor($absDiff / 60) . 'm ago';
        if ($absDiff < 86400) return floor($absDiff / 3600) . 'h ago';
        return floor($absDiff / 86400) . 'd ago';
    }
}
