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

    private const TERMINAL_STATUSES = ['1st Deposit', '2nd Deposit', 'Closed', 'Lost'];

    public function handle(): void
    {
        $hours = (int) $this->option('hours');

        $enquiries = Enquiry::whereNotNull('user_id')
            ->whereNotIn('status', self::TERMINAL_STATUSES)
            ->whereDoesntHave('followUps', function ($query) use ($hours) {
                $query->where('created_at', '>=', now()->subHours($hours));
            })
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
