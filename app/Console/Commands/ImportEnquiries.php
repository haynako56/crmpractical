<?php

namespace App\Console\Commands;

use App\Services\EnquiryImportService;
use Illuminate\Console\Command;

class ImportEnquiries extends Command
{
    protected $signature   = 'enquiries:import {file : Full path to the CSV file}';
    protected $description = 'Import enquiries from a CSV file. Rows whose contactform7_id already exists are skipped.';

    public function handle(EnquiryImportService $importService): int
    {
        $filePath = $this->argument('file');

        if (!file_exists($filePath)) {
            $this->error("File not found: {$filePath}");
            return Command::FAILURE;
        }

        $result = $importService->importFromPath($filePath);

        $this->info("Imported: {$result['imported']} rows");
        $this->line("Skipped:  {$result['skipped']} rows (contactform7_id already exists)");

        return Command::SUCCESS;
    }
}
