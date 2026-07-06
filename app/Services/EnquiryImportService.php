<?php

namespace App\Services;

use App\Models\Enquiry;
use App\Models\FollowUp;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;

class EnquiryImportService
{
    private array $userCache = [];

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
        $headers    = array_map(fn(string $header) => $this->normalizeHeader($header), $rawHeaders);

        // Detect format by presence of the "client name" header
        $isNewFormat = in_array('client name', $headers);

        while (($csvRow = fgetcsv($fileHandle, 0, ',', '"', '"')) !== false) {
            // Pad short rows; truncate long rows — both ensure array_combine succeeds
            $csvRow = array_slice(array_pad($csvRow, count($headers), ''), 0, count($headers));

            $rowData = array_combine($headers, $csvRow);

            $result = $isNewFormat
                ? $this->importNewRow($rowData)
                : $this->importOldRow($rowData);

            $importedCount += $result['imported'];
            $skippedCount  += $result['skipped'];
        }

        fclose($fileHandle);

        return [
            'imported' => $importedCount,
            'skipped'  => $skippedCount,
        ];
    }

    private function importNewRow(array $rowData): array
    {
        $name  = trim($rowData['client name'] ?? '');
        $phone = trim($rowData['phone'] ?? '');

        // Skip completely blank rows
        if ($name === '' && $phone === '') {
            return ['imported' => 0, 'skipped' => 0];
        }

        $repName    = trim($rowData['sales rep'] ?? '');
        $userId     = $this->lookupUserId($repName);
        $date       = $this->parseDate($rowData['date'] ?? '');
        $depositRaw = trim($rowData['first deposit taken'] ?? '');
        $hasDeposit = $depositRaw !== '';

        // If duplicate exists: update status/follow-ups if needed, then skip
        if ($name !== '' && $phone !== '') {
            $existing = Enquiry::withTrashed()->where('name', $name)->where('phone', $phone)->first();
            if ($existing) {
                $followUpRaw = trim($rowData['follow-up notes'] ?? '');
                if ($hasDeposit && $existing->dep1 !== 'YES') {
                    $existing->update(['status' => '1st Deposit', 'dep1' => 'YES']);
                    FollowUp::create([
                        'enquiry_id' => $existing->id,
                        'user_id'    => $userId,
                        'date'       => $date,
                        'message'    => '1st Deposit taken: ' . $depositRaw,
                    ]);
                } elseif ($followUpRaw !== '' && $existing->status === 'New') {
                    $existing->update(['status' => 'Contacted']);
                }
                return ['imported' => 0, 'skipped' => 1];
            }
        }

        $followUpRaw = trim($rowData['follow-up notes'] ?? '');
        $hasFollowUp = $followUpRaw !== '';

        if ($hasDeposit) {
            $status = '1st Deposit';
        } elseif ($hasFollowUp) {
            $status = 'Contacted';
        } else {
            $status = 'New';
        }

        $enquiry = Enquiry::create([
            'date'                    => $date,
            'name'                    => $name,
            'phone'                   => $phone,
            'email'                   => trim($rowData['email address'] ?? ''),
            'source'                  => trim($rowData['source'] ?? ''),
            'lead'                    => trim($rowData['lead source'] ?? ''),
            'type'                    => trim($rowData['interest in'] ?? ''),
            'loc'                     => trim($rowData['postcode/build location'] ?? ''),
            'postcode'                => trim($rowData['postcode/build location'] ?? ''),
            'rep'                     => $repName,
            'user_id'                 => $userId,
            'status'                  => $status,
            'dep1'                    => $hasDeposit ? 'YES' : 'NO',
            'dep2'                    => 'NO',
            'notes'                   => trim($rowData['enquiry notes'] ?? ''),
            'join_email_list'         => $this->parseBoolean($rowData['newsletter'] ?? ''),
            'first_contact_timestamp' => $date,
            'files'                   => [],
            'files_count'             => 0,
        ]);

        if ($hasFollowUp) {
            $this->createFollowUps($enquiry->id, $userId, $date, $followUpRaw);
        }

        if ($hasDeposit) {
            FollowUp::create([
                'enquiry_id' => $enquiry->id,
                'user_id'    => $userId,
                'date'       => $date,
                'message'    => '1st Deposit taken: ' . $depositRaw,
            ]);
        }

        return ['imported' => 1, 'skipped' => 0];
    }

    private function importOldRow(array $rowData): array
    {
        $contactform7Id = trim($rowData['id'] ?? '');

        if ($contactform7Id && Enquiry::withTrashed()->where('contactform7_id', $contactform7Id)->exists()) {
            return ['imported' => 0, 'skipped' => 1];
        }

        Enquiry::create([
            'contactform7_id'         => $contactform7Id ?: null,
            'cf7_status'              => $rowData['status'] ?? null,
            'date'                    => $this->parseDate($rowData['date'] ?? ''),
            'name'                    => $rowData['name'] ?? '',
            'phone'                   => $rowData['phone'] ?? '',
            'email'                   => $rowData['email'] ?? '',
            'postcode'                => $rowData['postcode'] ?? '',
            'where_did_you_hear'      => $rowData['wheredidyouhear'] ?? '',
            'source'                  => $rowData['source'] ?? $rowData['wheredidyouhear'] ?? '',
            'lead'                    => $rowData['lead'] ?? '',
            'type'                    => $rowData['interested'] ?? $rowData['type'] ?? '',
            'design_name'             => $rowData['designname'] ?? '',
            'loc'                     => $rowData['houselandname'] ?? $rowData['postcode'] ?? '',
            'rep'                     => $rowData['rep'] ?? '',
            'status'                  => $rowData['crmstatus'] ?? 'New',
            'dep1'                    => $rowData['1st deposit'] ?? 'NO',
            'dep2'                    => $rowData['2nd deposit'] ?? 'NO',
            'fu'                      => $rowData['follow-up'] ?? '',
            'message'                 => $rowData['message'] ?? '',
            'notes'                   => $rowData['notes'] ?? '',
            'join_email_list'         => $this->parseBoolean($rowData['joinemaillist'] ?? $rowData['join_email_list'] ?? ''),
            'alt_s'                   => $rowData['alt s'] ?? $rowData['alts'] ?? '',
            'ajxizl7033'              => $rowData['ajxizl7033'] ?? '',
            'files_count'             => (int) ($rowData['files'] ?? 0),
            'files'                   => [],
            'first_contact_timestamp' => $this->parseDate($rowData['date'] ?? ''),
        ]);

        return ['imported' => 1, 'skipped' => 0];
    }

    private function normalizeHeader(string $header): string
    {
        // Lowercase, strip non-printable/invisible characters, collapse whitespace
        $header = strtolower($header);
        $header = preg_replace('/[^\x20-\x7E]/u', ' ', $header); // strip non-ASCII / invisible chars
        $header = preg_replace('/\s+/', ' ', $header);            // collapse whitespace
        return trim($header);
    }

    private function lookupUserId(string $repName): ?int
    {
        if ($repName === '') {
            return null;
        }

        if (array_key_exists($repName, $this->userCache)) {
            return $this->userCache[$repName];
        }

        $this->userCache[$repName] = User::where('name', $repName)->value('id');

        return $this->userCache[$repName];
    }

    private function createFollowUps(int $enquiryId, ?int $userId, string $fallbackDate, string $raw): void
    {
        $lines   = preg_split('/\r\n|\r|\n/', $raw);
        $entries = [];
        $current = null;

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') continue;

            // Match lines starting with a date: "dd/mm/yyyy - note text" or "d/mm/yyyy – note text"
            if (preg_match('/^(\d{1,2}\/\d{2}\/\d{4})\s*[-–]\s*(.*)$/u', $line, $matches)) {
                if ($current !== null) {
                    $entries[] = $current;
                }
                $current = ['date' => $matches[1], 'message' => trim($matches[2])];
            } else {
                if ($current !== null) {
                    $current['message'] .= ' ' . $line;
                } else {
                    // Freeform text with no leading date — treat as a single note
                    $current = ['date' => null, 'message' => $line];
                }
            }
        }

        if ($current !== null) {
            $entries[] = $current;
        }

        foreach ($entries as $entry) {
            $message = trim($entry['message']);
            if ($message === '') continue;

            FollowUp::create([
                'enquiry_id' => $enquiryId,
                'user_id'    => $userId,
                'date'       => $entry['date'] ? $this->parseDate($entry['date']) : $fallbackDate,
                'message'    => $message,
            ]);
        }
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

        // D/MM/YYYY or DD/MM/YYYY
        if (preg_match('/^\d{1,2}\/\d{2}\/\d{4}$/', $value)) {
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
