<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApiSetting extends Model
{
    protected $fillable = [
        'cf7_api_url',
        'cf7_api_username',
        'cf7_api_password',
    ];

    protected $casts = [
        'cf7_api_password' => 'encrypted',
    ];

    public static function getInstance(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }
}
