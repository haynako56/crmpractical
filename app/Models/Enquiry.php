<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Enquiry extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'contactform7_id',
        'cf7_status',
        'date',
        'name',
        'phone',
        'email',
        'source',
        'where_did_you_hear',
        'lead',
        'type',
        'interested',
        'loc',
        'postcode',
        'rep',
        'status',
        'dep1',
        'dep2',
        'notes',
        'design_name',
        'alt_s',
        'ajxizl7033',
        'message',
        'join_email_list',
        'fu',
        'first_contact_timestamp',
        'files',
        'files_count',
        'user_id',
    ];

    protected $casts = [
        'date'                    => 'date:Y-m-d',
        'first_contact_timestamp' => 'datetime',
        'files'                   => 'array',
        'join_email_list'         => 'boolean',
        'user_id'                 => 'integer',
    ];

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function followUps(): HasMany
    {
        return $this->hasMany(FollowUp::class)->orderBy('date')->orderBy('id');
    }
}
