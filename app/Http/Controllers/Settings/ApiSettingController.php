<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\ApiSetting;
use App\Services\Cf7ApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApiSettingController extends Controller
{
    public function edit(): Response
    {
        abort_if(! auth()->user()?->hasRole('Super Admin'), 403);

        $settings = ApiSetting::getInstance();

        return Inertia::render('cf7-sync', [
            'cf7ApiUrl'      => $settings->cf7_api_url,
            'cf7ApiUsername' => $settings->cf7_api_username,
            'hasPassword'    => !empty($settings->cf7_api_password),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        abort_if(! auth()->user()?->hasRole('Super Admin'), 403);

        $validated = $request->validate([
            'cf7_api_url'      => ['required', 'url'],
            'cf7_api_username' => ['required', 'string', 'max:255'],
            'cf7_api_password' => ['nullable', 'string', 'max:255'],
        ]);

        $settings = ApiSetting::getInstance();
        $settings->cf7_api_url      = $validated['cf7_api_url'];
        $settings->cf7_api_username = $validated['cf7_api_username'];

        if (!empty($validated['cf7_api_password'])) {
            $settings->cf7_api_password = $validated['cf7_api_password'];
        }

        $settings->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'API settings updated.']);

        return to_route('cf7-sync.edit');
    }

    public function sync(Cf7ApiService $apiService): RedirectResponse
    {
        abort_if(! auth()->user()?->hasRole('Super Admin'), 403);

        try {
            $result = $apiService->syncEnquiries();
            Inertia::flash('toast', [
                'type'    => 'success',
                'message' => "Sync complete — {$result['imported']} imported, {$result['skipped']} skipped.",
            ]);
        } catch (\RuntimeException $exception) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $exception->getMessage()]);
        }

        return to_route('cf7-sync.edit');
    }
}
