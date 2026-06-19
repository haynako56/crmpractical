<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FollowUp extends Model
{
    protected $fillable = [
        'enquiry_id',
        'user_id',
        'date',
        'message',
        'file_path',
        'file_name',
        'file_size',
        'file_mime',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
    ];

    public function enquiry(): BelongsTo
    {
        return $this->belongsTo(Enquiry::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
