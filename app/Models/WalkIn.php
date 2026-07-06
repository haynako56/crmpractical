<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalkIn extends Model
{
    public const VILLAGES = [
        'Box Hill'       => '5 Joalah Circuit, Box Hill NSW 2765',
        'Menangle Park'  => 'Rosehill Lane, Menangle Park NSW 2563',
        'Leppington'     => 'Gurner Ave, Leppington NSW 2179',
    ];

    public const VISITOR_TYPES = ['Couple', 'Family', 'Single', 'Investor', 'Other'];

    protected $fillable = [
        'village',
        'date',
        'visitors',
        'type',
        'user_id',
        'notes',
        'enquiry_id',
    ];

    protected $casts = [
        'date'     => 'date:Y-m-d',
        'visitors' => 'integer',
    ];

    public function repOnDuty(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function enquiry(): BelongsTo
    {
        return $this->belongsTo(Enquiry::class);
    }
}
