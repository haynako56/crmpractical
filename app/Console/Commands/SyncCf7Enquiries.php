<?php

namespace App\Console\Commands;

use App\Services\Cf7ApiService;
use Illuminate\Console\Command;

class SyncCf7Enquiries extends Command
{
    protected $signature   = 'enquiries:sync-cf7';
    protected $description = 'Sync enquiries from the CF7 API. Submissions whose contactform7_id already exists are skipped.';

    public function handle(Cf7ApiService $apiService): int
    {
        $this->info('Syncing enquiries from CF7 API...');

        try {
            $result = $apiService->syncEnquiries();
        } catch (\RuntimeException $exception) {
            $this->error($exception->getMessage());
            return Command::FAILURE;
        }

        $this->info("Imported: {$result['imported']} submissions");
        $this->line("Skipped:  {$result['skipped']} submissions (already exist)");

        return Command::SUCCESS;
    }
}
