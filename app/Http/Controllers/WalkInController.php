<?php

namespace App\Http\Controllers;

use App\Models\Enquiry;
use App\Models\WalkIn;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class WalkInController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'village'         => ['required', 'string', 'in:' . implode(',', array_keys(WalkIn::VILLAGES))],
            'date'            => ['required', 'date'],
            'visitors'        => ['required', 'integer', 'min:1', 'max:99'],
            'type'            => ['nullable', 'string', 'in:' . implode(',', WalkIn::VISITOR_TYPES)],
            'user_id'         => ['nullable', 'integer', 'exists:users,id'],
            'notes'           => ['nullable', 'string'],
            'create_enquiry'  => ['sometimes', 'boolean'],
            'enquiry_name'    => ['required_if:create_enquiry,true', 'nullable', 'string', 'max:255'],
            'enquiry_phone'   => ['nullable', 'string', 'max:50'],
            'enquiry_email'   => ['nullable', 'string', 'max:255'],
            'enquiry_type'    => ['nullable', 'string', 'max:100'],
            'enquiry_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $createEnquiry = (bool) ($validated['create_enquiry'] ?? false);

        $walkIn = DB::transaction(function () use ($validated, $createEnquiry) {
            $walkIn = WalkIn::create([
                'village'  => $validated['village'],
                'date'     => $validated['date'],
                'visitors' => $validated['visitors'],
                'type'     => $validated['type'] ?? null,
                'user_id'  => $validated['user_id'] ?? null,
                'notes'    => $validated['notes'] ?? null,
            ]);

            if ($createEnquiry) {
                $this->createLinkedEnquiry($walkIn, $validated);
            }

            return $walkIn;
        });

        $message = $createEnquiry ? 'Walk-in recorded and enquiry created.' : 'Walk-in recorded.';
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return redirect()->route('display-homes');
    }

    public function update(Request $request, WalkIn $walkIn)
    {
        $validated = $request->validate([
            'village'         => ['sometimes', 'string', 'in:' . implode(',', array_keys(WalkIn::VILLAGES))],
            'date'            => ['sometimes', 'date'],
            'visitors'        => ['sometimes', 'integer', 'min:1', 'max:99'],
            'type'            => ['sometimes', 'nullable', 'string', 'in:' . implode(',', WalkIn::VISITOR_TYPES)],
            'user_id'         => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'notes'           => ['sometimes', 'nullable', 'string'],
            'create_enquiry'  => ['sometimes', 'boolean'],
            'enquiry_name'    => ['required_if:create_enquiry,true', 'nullable', 'string', 'max:255'],
            'enquiry_phone'   => ['nullable', 'string', 'max:50'],
            'enquiry_email'   => ['nullable', 'string', 'max:255'],
            'enquiry_type'    => ['nullable', 'string', 'max:100'],
            'enquiry_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $createEnquiry = (bool) ($validated['create_enquiry'] ?? false) && ! $walkIn->enquiry_id;

        DB::transaction(function () use ($walkIn, $validated, $createEnquiry) {
            $walkIn->update(collect($validated)->except([
                'create_enquiry', 'enquiry_name', 'enquiry_phone', 'enquiry_email', 'enquiry_type', 'enquiry_user_id',
            ])->all());

            if ($createEnquiry) {
                $this->createLinkedEnquiry($walkIn, $validated);
            }
        });

        $message = $createEnquiry ? 'Walk-in updated and enquiry created.' : 'Walk-in updated.';
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return redirect()->back();
    }

    private function createLinkedEnquiry(WalkIn $walkIn, array $validated): void
    {
        $enquiry = Enquiry::create([
            'name'                    => $validated['enquiry_name'],
            'phone'                   => $validated['enquiry_phone'] ?? null,
            'email'                   => $validated['enquiry_email'] ?? null,
            'date'                    => $walkIn->date,
            'type'                    => $validated['enquiry_type'] ?? 'H&L',
            'source'                  => 'Display Home',
            'lead'                    => 'Display Home',
            'notes'                   => "Walk-in at {$walkIn->village} Display Village on {$walkIn->date->format('d/m/Y')}."
                . (! empty($walkIn->notes) ? ' Notes: ' . $walkIn->notes : ''),
            'user_id'                 => $validated['enquiry_user_id'] ?? $walkIn->user_id,
            'status'                  => 'New',
            'dep1'                    => 'NO',
            'dep2'                    => 'NO',
            'first_contact_timestamp' => now(),
        ]);

        $walkIn->update(['enquiry_id' => $enquiry->id]);
    }

    public function destroy(WalkIn $walkIn)
    {
        $canDelete = auth()->user()?->hasRole('Super Admin') || auth()->user()?->hasRole('Admin');
        if (! $canDelete) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'You are not allowed to delete walk-ins.']);
            return redirect()->back();
        }

        $walkIn->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Walk-in deleted.']);

        return redirect()->back();
    }
}
