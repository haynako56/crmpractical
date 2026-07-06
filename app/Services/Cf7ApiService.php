<?php

namespace App\Services;

use App\Models\ApiSetting;
use App\Models\Enquiry;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;

class Cf7ApiService
{
    public function syncEnquiries(): array
    {
        $settings = ApiSetting::getInstance();

        if (empty($settings->cf7_api_url) || empty($settings->cf7_api_username) || empty($settings->cf7_api_password)) {
            throw new \RuntimeException('CF7 API settings are not fully configured.');
        }

        $importedCount = 0;
        $skippedCount  = 0;
        $page          = 1;

        do {
            $response = Http::withBasicAuth($settings->cf7_api_username, $settings->cf7_api_password)
                ->get($settings->cf7_api_url, ['page' => $page]);

            if (!$response->successful()) {
                throw new \RuntimeException("CF7 API request failed with status {$response->status()}.");
            }

            $body        = $response->json();
            $totalPages  = (int) ($body['total_pages'] ?? 1);

            foreach ($body['submissions'] ?? [] as $submission) {
                $contactformId = (string) $submission['id'];

                if (Enquiry::withTrashed()->where('contactform7_id', $contactformId)->exists()) {
                    $skippedCount++;
                    continue;
                }

                Enquiry::create($this->mapSubmission($submission));
                $importedCount++;
            }

            $page++;
        } while ($page <= $totalPages);

        return [
            'imported' => $importedCount,
            'skipped'  => $skippedCount,
        ];
    }

    private function mapSubmission(array $submission): array
    {
        $data        = $submission['data'] ?? [];
        $submittedAt = Carbon::parse($submission['submitted']);

        $interested      = (array) ($data['Interested'] ?? []);
        $whereDidYouHear = (array) ($data['Wheredidyouhear'] ?? []);
        $joinEmailList   = (array) ($data['JoinEmailList'] ?? []);

        $interestedStr      = implode(', ', array_filter($interested));
        $whereDidYouHearStr = implode(', ', array_filter($whereDidYouHear));

        return [
            'contactform7_id'         => (string) $submission['id'],
            'cf7_status'              => $data['cfdb7_status'] ?? null,
            'date'                    => $submittedAt->format('Y-m-d'),
            'first_contact_timestamp' => $submittedAt,
            'name'                    => $data['Name'] ?? '',
            'email'                   => $data['Email'] ?? '',
            'phone'                   => $data['Phone'] ?? '',
            'postcode'                => $data['Postcode'] ?? '',
            'type'                    => $interestedStr,
            'interested'              => $interestedStr,
            'where_did_you_hear'      => $whereDidYouHearStr,
            'source'                  => $whereDidYouHearStr,
            'message'                 => html_entity_decode($data['Message'] ?? '', ENT_QUOTES | ENT_HTML5),
            'design_name'             => $data['DesignName'] ?? '',
            'loc'                     => $data['HouseLandName'] ?? $data['Postcode'] ?? '',
            'alt_s'                   => $data['alt_s'] ?? '',
            'ajxizl7033'              => $data['ajxizl7033'] ?? '',
            'join_email_list'         => !empty($joinEmailList),
            'status'                  => 'New',
            'dep1'                    => 'NO',
            'dep2'                    => 'NO',
            'files'                   => [],
            'files_count'             => 0,
        ];
    }
}
