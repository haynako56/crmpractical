<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnquiryAssignmentConfirmation extends Model
{
    protected $fillable = [
        'enquiry_id',
        'user_id',
        'token',
        'confirmed_at',
        'reminder_sent_at',
    ];

    protected $casts = [
        'confirmed_at'     => 'datetime',
        'reminder_sent_at' => 'datetime',
    ];

    public function enquiry(): BelongsTo
    {
        return $this->belongsTo(Enquiry::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isConfirmed(): bool
    {
        return $this->confirmed_at !== null;
    }
}
