<?php

namespace App\Console\Commands;

use App\Models\EnquiryAssignmentConfirmation;
use App\Notifications\EnquiryAssignmentReminder;
use Illuminate\Console\Command;

class SendAssignmentReminders extends Command
{
    protected $signature = 'assignments:send-reminders
                            {--force : Send reminders regardless of the 24-hour threshold}';

    protected $description = 'Send reminder notifications for unconfirmed enquiry assignments';

    public function handle(): void
    {
        $query = EnquiryAssignmentConfirmation::whereNull('confirmed_at')
            ->whereNull('reminder_sent_at')
            ->with(['enquiry', 'user']);

        if (! $this->option('force')) {
            $query->where('created_at', '<=', now()->subHours(24));
        }

        $pending = $query->get();

        if ($pending->isEmpty()) {
            $this->info('No unconfirmed assignments to remind.');
            return;
        }

        $this->info("Sending reminders for {$pending->count()} unconfirmed assignment(s)…");

        foreach ($pending as $confirmation) {
            $confirmation->update(['reminder_sent_at' => now()]);
            $confirmation->user?->notify(
                new EnquiryAssignmentReminder($confirmation->enquiry, $confirmation->token)
            );
            $this->line("  ✓ {$confirmation->user?->email} — {$confirmation->enquiry?->name}");
        }

        $this->info('Done.');
    }
}
