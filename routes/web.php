<?php

use App\Http\Controllers\Settings\ApiSettingController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::redirect('dashboard', '/enquiries')->name('dashboard');

    Route::get('team', [\App\Http\Controllers\TeamController::class, 'index'])->name('team');
    Route::post('team', [\App\Http\Controllers\TeamController::class, 'store'])->name('team.store');
    Route::patch('team/{user}', [\App\Http\Controllers\TeamController::class, 'update'])->name('team.update');
    Route::delete('team/{user}', [\App\Http\Controllers\TeamController::class, 'destroy'])->name('team.destroy');

    Route::get('alerts', [\App\Http\Controllers\AlertController::class, 'index'])->name('alerts');
    Route::get('leads', [\App\Http\Controllers\LeadController::class, 'index'])->name('leads');
    Route::get('deposits', [\App\Http\Controllers\DepositController::class, 'index'])->name('deposits');

    Route::get('reports', [\App\Http\Controllers\ReportController::class, 'reports'])->name('reports');
    Route::get('status-report', [\App\Http\Controllers\ReportController::class, 'statusReport'])->name('status-report');

    Route::get('enquiries', [\App\Http\Controllers\EnquiryController::class, 'index'])->name('enquiries');
    Route::post('enquiries', [\App\Http\Controllers\EnquiryController::class, 'store'])->name('enquiries.store');
    Route::patch('enquiries/{enquiry}', [\App\Http\Controllers\EnquiryController::class, 'update'])->name('enquiries.update');
    Route::post('enquiries/import', [\App\Http\Controllers\EnquiryController::class, 'import'])->name('enquiries.import');

    Route::post('enquiries/{enquiry}/follow-ups', [\App\Http\Controllers\FollowUpController::class, 'store'])->name('follow-ups.store');
    Route::patch('follow-ups/{followUp}', [\App\Http\Controllers\FollowUpController::class, 'update'])->name('follow-ups.update');
    Route::delete('follow-ups/{followUp}', [\App\Http\Controllers\FollowUpController::class, 'destroy'])->name('follow-ups.destroy');
    Route::get('follow-ups/{followUp}/download', [\App\Http\Controllers\FollowUpController::class, 'download'])->name('follow-ups.download');

    Route::post('enquiries/{enquiry}/files', [\App\Http\Controllers\EnquiryFileController::class, 'store'])->name('enquiry-files.store');
    Route::delete('enquiries/{enquiry}/files/{index}', [\App\Http\Controllers\EnquiryFileController::class, 'destroy'])->name('enquiry-files.destroy');
    Route::get('enquiries/{enquiry}/files/{index}/download', [\App\Http\Controllers\EnquiryFileController::class, 'download'])->name('enquiry-files.download');

    Route::get('cf7-sync', [ApiSettingController::class, 'edit'])->name('cf7-sync.edit');
    Route::put('cf7-sync', [ApiSettingController::class, 'update'])->name('cf7-sync.update');
    Route::post('cf7-sync/run', [ApiSettingController::class, 'sync'])->name('cf7-sync.sync');
});

require __DIR__.'/settings.php';
