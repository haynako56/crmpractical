<?php

namespace App\Http\Controllers;

use App\Models\Enquiry;
use App\Models\User;
use App\Notifications\EnquiryAssigned;
use App\Services\EnquiryImportService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EnquiryController extends Controller
{
    public function index()
    {
        $users = User::orderBy('name')->get()->map(fn (User $user) => [
            'id'     => $user->id,
            'name'   => $user->name,
            'email'  => $user->email,
            'title'  => $user->title,
            'phone'  => $user->phone,
            'status' => $user->status,
            'color'  => $user->color ?? 0,
        ]);

        $enquiries = Enquiry::with(['followUps', 'assignedUser'])
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Enquiry $enquiry) => [
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
                'dep1'                  => $enquiry->dep1,
                'dep2'                  => $enquiry->dep2,
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
                'followUps'             => $enquiry->followUps->map(fn ($followUp) => [
                    'id'        => $followUp->id,
                    'date'      => $followUp->date?->format('Y-m-d'),
                    'message'   => $followUp->message,
                    'file_name' => $followUp->file_name,
                    'file_size' => $followUp->file_size,
                    'file_mime' => $followUp->file_mime,
                ]),
            ]);

        return Inertia::render('enquiries', ['enquiries' => $enquiries, 'users' => $users]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'    => ['required', 'string', 'max:255'],
            'phone'   => ['nullable', 'string', 'max:50'],
            'email'   => ['nullable', 'string', 'max:255'],
            'loc'     => ['nullable', 'string', 'max:255'],
            'date'    => ['required', 'date'],
            'type'    => ['required', 'string', 'max:100'],
            'rep'     => ['nullable', 'string', 'max:100'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'source'  => ['required', 'string', 'max:100'],
            'lead'    => ['required', 'string', 'max:100'],
            'notes'   => ['nullable', 'string'],
        ]);

        Enquiry::create(array_merge($validated, [
            'status'                  => 'New',
            'dep1'                    => 'NO',
            'dep2'                    => 'NO',
            'first_contact_timestamp' => now(),
        ]));

        return redirect()->route('enquiries')->with('flash', 'Enquiry created successfully');
    }

    public function update(Request $request, Enquiry $enquiry)
    {
        $isSuperAdmin = auth()->user()?->hasRole('Super Admin');
        if (! $isSuperAdmin && auth()->user()?->id !== $enquiry->user_id) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'You are not allowed to edit this enquiry.']);
            return redirect()->back();
        }

        $previousUserId = $enquiry->user_id;

        $rules = [
            'name'    => ['sometimes', 'string', 'max:255'],
            'phone'   => ['sometimes', 'nullable', 'string', 'max:50'],
            'email'   => ['sometimes', 'nullable', 'string', 'max:255'],
            'loc'     => ['sometimes', 'nullable', 'string', 'max:255'],
            'date'    => ['sometimes', 'nullable', 'date'],
            'type'    => ['sometimes', 'nullable', 'string', 'max:100'],
            'rep'     => ['sometimes', 'nullable', 'string', 'max:100'],
            'source'  => ['sometimes', 'nullable', 'string', 'max:100'],
            'lead'    => ['sometimes', 'nullable', 'string', 'max:100'],
            'notes'   => ['sometimes', 'nullable', 'string'],
            'fu'      => ['sometimes', 'nullable', 'string'],
            'dep1'    => ['sometimes', 'in:YES,NO'],
            'dep2'    => ['sometimes', 'in:YES,NO'],
            'status'  => ['sometimes', 'in:New,Contacted,Meeting,1st Deposit,2nd Deposit,Closed,Lost'],
        ];

        if ($isSuperAdmin) {
            $rules['user_id'] = ['sometimes', 'nullable', 'integer', 'exists:users,id'];
        }

        $enquiry->update($request->validate($rules));

        if ($isSuperAdmin && $enquiry->user_id && $enquiry->user_id !== $previousUserId) {
            $enquiry->assignedUser?->notify(new EnquiryAssigned($enquiry));
        }

        return redirect()->back()->with('flash', 'Enquiry updated successfully');
    }

    public function destroy(Enquiry $enquiry)
    {
        if (! auth()->user()?->hasRole('Super Admin')) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Only Super Admins can delete enquiries.']);
            return redirect()->back();
        }

        foreach ($enquiry->followUps as $followUp) {
            if ($followUp->file_path) {
                \Illuminate\Support\Facades\Storage::disk('local')->delete($followUp->file_path);
            }
        }

        foreach ($enquiry->files ?? [] as $filePath) {
            \Illuminate\Support\Facades\Storage::disk('local')->delete($filePath);
        }

        $enquiry->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Enquiry deleted.']);

        return redirect()->back();
    }

    public function import(Request $request, EnquiryImportService $importService)
    {
        if (! auth()->user()?->hasRole('Super Admin')) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Only Super Admins can import enquiries.']);
            return redirect()->back();
        }

        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        $result = $importService->importFromUpload($request->file('file'));

        $message = "Imported {$result['imported']}";

        if ($result['skipped'] > 0) {
            $message .= ", skipped {$result['skipped']} (already existed)";
        }

        return redirect()->route('enquiries')->with('flash', $message);
    }
}
