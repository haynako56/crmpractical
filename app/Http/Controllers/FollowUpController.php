<?php

namespace App\Http\Controllers;

use App\Models\Enquiry;
use App\Models\FollowUp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class FollowUpController extends Controller
{
    public function store(Request $request, Enquiry $enquiry)
    {
        $request->validate([
            'date'    => ['required', 'date'],
            'message' => ['required', 'string', 'max:5000'],
            'file'    => ['nullable', 'file', 'max:10240'],
        ]);

        $filePath = null;
        $fileName = null;
        $fileSize = null;
        $fileMime = null;

        if ($request->hasFile('file')) {
            $file     = $request->file('file');
            $fileName = $file->getClientOriginalName();
            $fileSize = $file->getSize();
            $fileMime = $file->getMimeType();
            $filePath = $file->store("follow-ups/{$enquiry->id}", 'local');
        }

        $enquiry->followUps()->create([
            'date'      => $request->date,
            'message'   => $request->message,
            'file_path' => $filePath,
            'file_name' => $fileName,
            'file_size' => $fileSize,
            'file_mime' => $fileMime,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Follow-up added.']);

        return redirect()->back();
    }

    public function update(Request $request, FollowUp $followUp)
    {
        $request->validate([
            'message'     => ['required', 'string', 'max:5000'],
            'file'        => ['nullable', 'file', 'max:10240'],
            'remove_file' => ['nullable'],
        ]);

        $data = ['message' => $request->message];

        if ($request->hasFile('file')) {
            if ($followUp->file_path) {
                Storage::disk('local')->delete($followUp->file_path);
            }
            $file              = $request->file('file');
            $data['file_path'] = $file->store("follow-ups/{$followUp->enquiry_id}", 'local');
            $data['file_name'] = $file->getClientOriginalName();
            $data['file_size'] = $file->getSize();
            $data['file_mime'] = $file->getMimeType();
        } elseif ($request->boolean('remove_file')) {
            if ($followUp->file_path) {
                Storage::disk('local')->delete($followUp->file_path);
            }
            $data['file_path'] = null;
            $data['file_name'] = null;
            $data['file_size'] = null;
            $data['file_mime'] = null;
        }

        $followUp->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Follow-up updated.']);

        return redirect()->back();
    }

    public function destroy(FollowUp $followUp)
    {
        if ($followUp->file_path) {
            Storage::disk('local')->delete($followUp->file_path);
        }

        $followUp->delete();

        return redirect()->back();
    }

    public function download(FollowUp $followUp)
    {
        abort_if(! $followUp->file_path, 404);

        return Storage::disk('local')->download($followUp->file_path, $followUp->file_name);
    }
}
