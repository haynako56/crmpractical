<?php

namespace Tests\Feature;

use App\Models\Enquiry;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnquiryControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    private function validEnquiryPayload(array $overrides = []): array
    {
        return array_merge([
            'name'   => 'Jane Doe',
            'date'   => now()->format('Y-m-d'),
            'type'   => 'Kitchen',
            'source' => 'Website',
            'lead'   => 'Hot',
        ], $overrides);
    }

    public function test_sales_consultant_can_create_an_enquiry_and_it_is_auto_assigned_to_them()
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');

        $otherUser = User::factory()->create();

        $response = $this->actingAs($sales)->post(route('enquiries.store'), $this->validEnquiryPayload([
            'user_id' => $otherUser->id,
        ]));

        $response->assertRedirect(route('enquiries'));

        $enquiry = Enquiry::firstOrFail();
        $this->assertSame($sales->id, $enquiry->user_id);
    }

    public function test_admin_can_assign_enquiry_to_a_chosen_user()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $rep = User::factory()->create();

        $response = $this->actingAs($admin)->post(route('enquiries.store'), $this->validEnquiryPayload([
            'user_id' => $rep->id,
        ]));

        $response->assertRedirect(route('enquiries'));

        $enquiry = Enquiry::firstOrFail();
        $this->assertSame($rep->id, $enquiry->user_id);
    }

    public function test_deleting_an_enquiry_soft_deletes_it()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $enquiry = Enquiry::create($this->validEnquiryPayload(['contactform7_id' => 'cf7-123']));

        $response = $this->actingAs($admin)->delete(route('enquiries.destroy', $enquiry));

        $response->assertRedirect();
        $this->assertSoftDeleted($enquiry);
        $this->assertDatabaseHas('enquiries', ['id' => $enquiry->id, 'contactform7_id' => 'cf7-123']);
    }

    public function test_soft_deleted_enquiry_is_hidden_from_the_index()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $enquiry = Enquiry::create($this->validEnquiryPayload());
        $enquiry->delete();

        $this->assertCount(0, Enquiry::all());
        $this->assertCount(1, Enquiry::withTrashed()->get());
    }
}
