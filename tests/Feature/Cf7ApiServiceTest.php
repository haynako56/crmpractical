<?php

namespace Tests\Feature;

use App\Models\ApiSetting;
use App\Models\Enquiry;
use App\Services\Cf7ApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class Cf7ApiServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_sync_does_not_recreate_a_soft_deleted_enquiry()
    {
        ApiSetting::create([
            'id'                => 1,
            'cf7_api_url'       => 'https://example.test/wp-json/cf7-api/v1/submissions',
            'cf7_api_username'  => 'user',
            'cf7_api_password'  => 'secret',
        ]);

        $enquiry = Enquiry::create([
            'contactform7_id' => '42',
            'name'            => 'Jane Doe',
            'date'            => now()->format('Y-m-d'),
            'type'            => 'Kitchen',
            'source'          => 'Website',
            'lead'            => 'Hot',
        ]);
        $enquiry->delete();

        Http::fake([
            'example.test/*' => Http::response([
                'total_pages'  => 1,
                'submissions'  => [
                    [
                        'id'        => 42,
                        'submitted' => now()->toDateTimeString(),
                        'data'      => ['Name' => 'Jane Doe'],
                    ],
                ],
            ]),
        ]);

        $result = app(Cf7ApiService::class)->syncEnquiries();

        $this->assertSame(0, $result['imported']);
        $this->assertSame(1, $result['skipped']);
        $this->assertCount(0, Enquiry::all());
        $this->assertCount(1, Enquiry::withTrashed()->get());
    }
}
