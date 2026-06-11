<?php

namespace App\Http\Controllers;

use App\Models\Enquiry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class TeamController extends Controller
{
    public function index()
    {
        $users = User::withCount([
            'enquiries as total_count',
            'enquiries as active_count'   => fn ($q) => $q->whereNotIn('status', ['Closed', 'Lost']),
            'enquiries as deposit_count'  => fn ($q) => $q->whereIn('status', ['1st Deposit', '2nd Deposit']),
        ])->orderBy('name')->get()->map(fn (User $user) => [
            'id'            => $user->id,
            'name'          => $user->name,
            'email'         => $user->email,
            'title'         => $user->title,
            'phone'         => $user->phone,
            'status'        => $user->status,
            'color'         => $user->color ?? 0,
            'total_count'   => $user->total_count,
            'active_count'  => $user->active_count,
            'deposit_count' => $user->deposit_count,
        ]);

        $unassigned = Enquiry::whereNull('user_id')
            ->select('id', 'name', 'type', 'loc', 'status', 'date', 'phone')
            ->orderByDesc('date')
            ->get()
            ->map(fn (Enquiry $enquiry) => [
                'id'     => $enquiry->id,
                'name'   => $enquiry->name,
                'type'   => $enquiry->type ?? '',
                'loc'    => $enquiry->loc ?? '',
                'status' => $enquiry->status,
                'date'   => $enquiry->date?->format('Y-m-d'),
                'phone'  => $enquiry->phone ?? '',
            ]);

        return Inertia::render('team', [
            'users'      => $users,
            'unassigned' => $unassigned,
        ]);
    }

    public function store(Request $request)
    {
        $this->requireSuperAdmin();

        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'title'    => ['nullable', 'string', 'max:100'],
            'phone'    => ['nullable', 'string', 'max:50'],
            'status'   => ['nullable', 'string', 'in:active,inactive'],
            'color'    => ['nullable', 'integer', 'min:0', 'max:7'],
        ]);

        User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
            'title'    => $validated['title'] ?? null,
            'phone'    => $validated['phone'] ?? null,
            'status'   => $validated['status'] ?? 'active',
            'color'    => $validated['color'] ?? 0,
        ]);

        return redirect()->route('team')->with('flash', $validated['name'] . ' added to team');
    }

    public function update(Request $request, User $user)
    {
        $this->requireSuperAdmin();

        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'password' => ['nullable', 'string', 'min:8'],
            'title'    => ['nullable', 'string', 'max:100'],
            'phone'    => ['nullable', 'string', 'max:50'],
            'status'   => ['nullable', 'string', 'in:active,inactive'],
            'color'    => ['nullable', 'integer', 'min:0', 'max:7'],
        ]);

        $data = [
            'name'   => $validated['name'],
            'email'  => $validated['email'],
            'title'  => $validated['title'] ?? null,
            'phone'  => $validated['phone'] ?? null,
            'status' => $validated['status'] ?? 'active',
            'color'  => $validated['color'] ?? 0,
        ];

        if (!empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }

        $user->update($data);

        return redirect()->route('team')->with('flash', $user->name . ' updated');
    }

    public function destroy(User $user)
    {
        $this->requireSuperAdmin();

        $user->enquiries()->update(['user_id' => null]);
        $user->delete();

        return redirect()->route('team')->with('flash', $user->name . ' removed from team');
    }

    private function requireSuperAdmin(): void
    {
        if (! auth()->user()?->hasRole('Super Admin')) {
            abort(403, 'Only super admins can manage team members.');
        }
    }
}
