<?php

namespace App\Http\Controllers;

use App\Models\Enquiry;
use App\Models\User;
use Inertia\Inertia;

class DepositController extends Controller
{
    public function index()
    {
        $with    = ['assignedUser', 'followUps.user'];
        $isSales = auth()->user()?->hasRole('Sales');
        $userId  = auth()->id();

        $base = Enquiry::query();
        if ($isSales) {
            $base->where('user_id', $userId);
        }

        $dep1 = (clone $base)->where('dep1', 'YES')
            ->with($with)->orderByDesc('date')->orderByDesc('id')
            ->get()->map(fn (Enquiry $e) => $this->row($e));

        $dep2 = (clone $base)->where('dep2', 'YES')
            ->with($with)->orderByDesc('date')->orderByDesc('id')
            ->get()->map(fn (Enquiry $e) => $this->row($e));

        $pipeline = (clone $base)->where('status', 'Meeting')
            ->with($with)->orderByDesc('date')->orderByDesc('id')
            ->get()->map(fn (Enquiry $e) => $this->row($e));

        $closed = (clone $base)->where('status', 'Cold')
            ->with($with)->orderByDesc('date')->orderByDesc('id')
            ->get()->map(fn (Enquiry $e) => $this->row($e));

        $users = User::orderBy('name')->get()->map(fn (User $user) => [
            'id'     => $user->id,
            'name'   => $user->name,
            'email'  => $user->email,
            'title'  => $user->title,
            'phone'  => $user->phone,
            'status' => $user->status,
            'color'  => $user->color ?? 0,
        ]);

        return Inertia::render('deposits', [
            'dep1'     => $dep1->values(),
            'dep2'     => $dep2->values(),
            'pipeline' => $pipeline->values(),
            'closed'   => $closed->values(),
            'users'    => $users,
            'stats'    => [
                'dep1Count' => $dep1->count(),
                'dep2Count' => $dep2->count(),
                'pipeline'  => $pipeline->count(),
                'closed'    => $closed->count(),
                'total'     => (clone $base)->count(),
            ],
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
            'dep2'                  => $enquiry->dep2 ?? 'NO',
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
