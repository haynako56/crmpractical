<?php

namespace App\Http\Controllers;

use App\Models\EnquiryAssignmentConfirmation;

class EnquiryAssignmentController extends Controller
{
    public function confirm(string $token)
    {
        $confirmation = EnquiryAssignmentConfirmation::where('token', $token)->firstOrFail();

        if (! $confirmation->isConfirmed()) {
            $confirmation->update(['confirmed_at' => now()]);
        }

        return redirect('/enquiries')->with('flash', 'Assignment confirmed. Thank you!');
    }
}
