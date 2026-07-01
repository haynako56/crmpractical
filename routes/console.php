<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');


Schedule::command('enquiries:sync-cf7')->everyFiveMinutes();
Schedule::command('assignments:send-reminders')->dailyAt('10:00');
Schedule::command('enquiries:send-no-response-alerts')->dailyAt('09:00');