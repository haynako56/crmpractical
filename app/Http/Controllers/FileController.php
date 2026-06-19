<?php

namespace App\Http\Controllers;

use App\Models\Enquiry;
use App\Models\FollowUp;
use Inertia\Inertia;

class FileController extends Controller
{
    public function index()
    {
        $isSales = auth()->user()?->hasRole('Sales');
        $userId  = auth()->id();

        // Enquiry files (stored as JSON array on the enquiries table)
        $enquiryQuery = Enquiry::whereNotNull('files')
            ->where('files', '!=', '[]')
            ->select('id', 'name', 'files', 'user_id');

        if ($isSales) {
            $enquiryQuery->where('user_id', $userId);
        }

        $enquiryFiles = collect();
        foreach ($enquiryQuery->get() as $enquiry) {
            foreach ($enquiry->files as $index => $file) {
                if (empty($file['file_path'])) {
                    continue;
                }
                $enquiryFiles->push([
                    'id'           => "enquiry-{$enquiry->id}-{$index}",
                    'type'         => 'enquiry',
                    'name'         => $file['name'],
                    'size'         => $file['size'],
                    'date'         => $file['date'] ?? null,
                    'sort_date'    => $file['date'] ?? '',
                    'enquiry_id'   => $enquiry->id,
                    'enquiry_name' => $enquiry->name,
                    'download_url' => route('enquiry-files.download', [$enquiry->id, $index]),
                ]);
            }
        }

        // Follow-up files
        $followUpQuery = FollowUp::whereNotNull('file_path')
            ->with('enquiry:id,name,user_id')
            ->orderByDesc('created_at');

        if ($isSales) {
            $followUpQuery->whereHas('enquiry', fn ($query) => $query->where('user_id', $userId));
        }

        $followUpFiles = $followUpQuery->get()->map(fn (FollowUp $followUp) => [
            'id'           => "followup-{$followUp->id}",
            'type'         => 'followup',
            'name'         => $followUp->file_name,
            'size'         => $followUp->file_size,
            'date'         => $followUp->date?->format('d/m/y'),
            'sort_date'    => $followUp->date?->format('Y-m-d') ?? '',
            'enquiry_id'   => $followUp->enquiry_id,
            'enquiry_name' => $followUp->enquiry?->name,
            'download_url' => route('follow-ups.download', $followUp->id),
        ]);

        $files = $enquiryFiles->merge($followUpFiles)
            ->sortByDesc('sort_date')
            ->values();

        return Inertia::render('files', ['files' => $files]);
    }
}
