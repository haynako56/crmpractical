<?php

namespace App\Http\Controllers;

use App\Models\Enquiry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EnquiryFileController extends Controller
{
    public function store(Request $request, Enquiry $enquiry)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240'],
        ]);

        $file     = $request->file('file');
        $filePath = $file->store("enquiry-files/{$enquiry->id}", 'local');

        $files   = $enquiry->files ?? [];
        $files[] = [
            'name'      => $file->getClientOriginalName(),
            'size'      => $file->getSize(),
            'date'      => now()->format('d/m/y'),
            'file_path' => $filePath,
        ];

        $enquiry->update(['files' => $files]);

        return redirect()->back();
    }

    public function destroy(Enquiry $enquiry, int $index)
    {
        $files = $enquiry->files ?? [];

        if (isset($files[$index])) {
            if (! empty($files[$index]['file_path'])) {
                Storage::disk('local')->delete($files[$index]['file_path']);
            }
            array_splice($files, $index, 1);
            $enquiry->update(['files' => array_values($files)]);
        }

        return redirect()->back();
    }

    public function download(Enquiry $enquiry, int $index)
    {
        $files = $enquiry->files ?? [];

        abort_if(! isset($files[$index]) || empty($files[$index]['file_path']), 404);

        return Storage::disk('local')->download(
            $files[$index]['file_path'],
            $files[$index]['name']
        );
    }
}
