<?php

namespace App\Console\Commands;

use App\Models\Enquiry;
use App\Notifications\EnquiryNoResponse;
use Illuminate\Console\Command;

class SendNoResponseAlerts extends Command
{
    protected $signature = 'enquiries:send-no-response-alerts
                            {--hours=24 : Hours of inactivity before alerting}';

    protected $description = 'Notify assigned users when no follow-up has been logged in the last 24 hours';

    public function handle(): void
    {
        $hours = (int) $this->option('hours');

        $enquiries = Enquiry::whereNotNull('user_id')
            ->where('status', 'New')
            ->whereNotNull('first_contact_timestamp')
            ->where('first_contact_timestamp', '<=', now()->subHours($hours))
            ->whereDoesntHave('followUps')
            ->where(fn ($query) => $query->whereNull('fu')->orWhere('fu', ''))
            ->with('assignedUser')
            ->get();

        if ($enquiries->isEmpty()) {
            $this->info('No enquiries without a recent response.');
            return;
        }

        $this->info("Sending no-response alerts for {$enquiries->count()} enquir(y/ies)…");

        foreach ($enquiries as $enquiry) {
            $enquiry->assignedUser?->notify(new EnquiryNoResponse($enquiry));
            $this->line("  ✓ {$enquiry->assignedUser?->email} — {$enquiry->name}");
        }

        $this->info('Done.');
    }
}
