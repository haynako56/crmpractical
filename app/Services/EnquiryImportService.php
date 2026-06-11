<?php

namespace App\Services;

use App\Models\Enquiry;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;

class EnquiryImportService
{
    public function importFromUpload(UploadedFile $uploadedFile): array
    {
        return $this->importFromPath($uploadedFile->getRealPath());
    }

    public function importFromPath(string $filePath): array
    {
        $fileHandle    = fopen($filePath, 'r');
        $importedCount = 0;
        $skippedCount  = 0;

        // Strip BOM if present (CF7 exports include a UTF-8 BOM)
        $firstBytes = fread($fileHandle, 3);
        if ($firstBytes !== "\xEF\xBB\xBF") {
            rewind($fileHandle);
        }

        $rawHeaders = fgetcsv($fileHandle, 0, ',', '"', '"');
        $headers    = array_map(fn(string $header) => strtolower(trim($header)), $rawHeaders);

        while (($csvRow = fgetcsv($fileHandle, 0, ',', '"', '"')) !== false) {
            // Skip rows that don't have enough columns
            if (count($csvRow) < count($headers)) {
                $csvRow = array_pad($csvRow, count($headers), '');
            }

            $rowData = array_combine($headers, $csvRow);

            $contactform7Id = trim($rowData['id'] ?? '');

            if ($contactform7Id && Enquiry::where('contactform7_id', $contactform7Id)->exists()) {
                $skippedCount++;
                continue;
            }

            Enquiry::create([
                // ── CF7 core fields ────────────────────────────────────────
                'contactform7_id'         => $contactform7Id ?: null,
                'cf7_status'              => $rowData['status'] ?? null,

                // ── Contact details ────────────────────────────────────────
                'date'                    => $this->parseDate($rowData['date'] ?? ''),
                'name'                    => $rowData['name'] ?? '',
                'phone'                   => $rowData['phone'] ?? '',
                'email'                   => $rowData['email'] ?? '',
                'postcode'                => $rowData['postcode'] ?? '',

                // ── Lead / source ──────────────────────────────────────────
                'where_did_you_hear'      => $rowData['wheredidyouhear'] ?? '',
                'source'                  => $rowData['source'] ?? $rowData['wheredidyouhear'] ?? '',
                'lead'                    => $rowData['lead'] ?? '',

                // ── Interest / type ────────────────────────────────────────
                'type'                    => $rowData['interested'] ?? $rowData['type'] ?? '',
                'design_name'             => $rowData['designname'] ?? '',
                'loc'                     => $rowData['houselandname'] ?? $rowData['postcode'] ?? '',

                // ── CRM fields (default for new imports) ───────────────────
                'rep'                     => $rowData['rep'] ?? '',
                'status'                  => $rowData['crmstatus'] ?? 'New',
                'dep1'                    => $rowData['1st deposit'] ?? 'NO',
                'dep2'                    => $rowData['2nd deposit'] ?? 'NO',
                'fu'                      => $rowData['follow-up'] ?? '',

                // ── Content fields ─────────────────────────────────────────
                'message'                 => $rowData['message'] ?? '',
                'notes'                   => $rowData['notes'] ?? '',
                'join_email_list'         => $this->parseBoolean($rowData['joinemaillist'] ?? $rowData['join_email_list'] ?? ''),

                // ── Extra CF7 columns ──────────────────────────────────────
                'alt_s'                   => $rowData['alt s'] ?? $rowData['alts'] ?? '',
                'ajxizl7033'              => $rowData['ajxizl7033'] ?? '',

                // ── File metadata ──────────────────────────────────────────
                'files_count'             => (int) ($rowData['files'] ?? 0),
                'files'                   => [],

                // ── Timestamps ────────────────────────────────────────────
                'first_contact_timestamp' => $this->parseDate($rowData['date'] ?? ''),
            ]);

            $importedCount++;
        }

        fclose($fileHandle);

        return [
            'imported' => $importedCount,
            'skipped'  => $skippedCount,
        ];
    }

    private function parseDate(string $value): string
    {
        $value = trim($value);

        if (empty($value)) {
            return now()->format('Y-m-d');
        }

        // YYYY-MM-DD HH:MM:SS  (CF7 datetime format)
        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $value)) {
            return Carbon::createFromFormat('Y-m-d H:i:s', $value)->format('Y-m-d');
        }

        // YYYY-MM-DD
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return $value;
        }

        // DD/MM/YYYY
        if (preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $value)) {
            return Carbon::createFromFormat('d/m/Y', $value)->format('Y-m-d');
        }

        // DD/MM/YY  →  20YY
        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{2})$/', $value, $matches)) {
            return Carbon::createFromFormat('d/m/Y', $matches[1] . '/' . $matches[2] . '/20' . $matches[3])->format('Y-m-d');
        }

        return now()->format('Y-m-d');
    }

    private function parseBoolean(string $value): bool
    {
        $normalised = strtolower(trim($value));

        return !($normalised === '' || $normalised === '0' || $normalised === 'false' || $normalised === 'no');
    }
}
