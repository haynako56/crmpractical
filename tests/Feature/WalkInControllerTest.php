<?php

namespace Tests\Feature;

use App\Models\Enquiry;
use App\Models\User;
use App\Models\WalkIn;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WalkInControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_authenticated_user_can_view_display_homes_page()
    {
        $user = User::factory()->create();
        $user->assignRole('Sales');

        $response = $this->actingAs($user)->get(route('display-homes'));

        $response->assertOk();
    }

    public function test_any_authenticated_user_can_record_a_walk_in()
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');
        $rep = User::factory()->create();

        $response = $this->actingAs($sales)->post(route('walk-ins.store'), [
            'village'  => 'Box Hill',
            'date'     => '2026-05-05',
            'visitors' => 3,
            'type'     => 'Family',
            'user_id'  => $rep->id,
            'notes'    => 'Loved the Sovereign design.',
        ]);

        $response->assertRedirect(route('display-homes'));
        $this->assertDatabaseHas('walk_ins', [
            'village'  => 'Box Hill',
            'visitors' => 3,
            'type'     => 'Family',
            'user_id'  => $rep->id,
        ]);
    }

    public function test_recording_a_walk_in_can_create_a_linked_enquiry()
    {
        $user = User::factory()->create();
        $user->assignRole('Admin');
        $rep = User::factory()->create();

        $response = $this->actingAs($user)->post(route('walk-ins.store'), [
            'village'         => 'Menangle Park',
            'date'            => '2026-05-10',
            'visitors'        => 2,
            'type'            => 'Couple',
            'notes'           => 'First home buyers.',
            'create_enquiry'  => true,
            'enquiry_name'    => 'Jane Visitor',
            'enquiry_phone'   => '0400000000',
            'enquiry_type'    => 'H&L',
            'enquiry_user_id' => $rep->id,
        ]);

        $response->assertRedirect(route('display-homes'));

        $walkIn = WalkIn::firstOrFail();
        $enquiry = Enquiry::firstOrFail();

        $this->assertSame($enquiry->id, $walkIn->enquiry_id);
        $this->assertSame('Jane Visitor', $enquiry->name);
        $this->assertSame($rep->id, $enquiry->user_id);
        $this->assertSame('Display Home', $enquiry->source);
        $this->assertStringContainsString('Menangle Park', $enquiry->notes);
    }

    public function test_walk_in_requires_enquiry_name_when_creating_enquiry()
    {
        $user = User::factory()->create();
        $user->assignRole('Admin');

        $response = $this->actingAs($user)->post(route('walk-ins.store'), [
            'village'        => 'Leppington',
            'date'           => '2026-05-12',
            'visitors'       => 1,
            'create_enquiry' => true,
        ]);

        $response->assertSessionHasErrors('enquiry_name');
        $this->assertDatabaseCount('walk_ins', 0);
    }

    public function test_any_authenticated_user_can_edit_a_walk_in()
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');

        $walkIn = WalkIn::create([
            'village' => 'Box Hill', 'date' => '2026-05-05', 'visitors' => 1,
        ]);

        $response = $this->actingAs($sales)->patch(route('walk-ins.update', $walkIn), [
            'visitors' => 5,
            'notes'    => 'Updated notes',
        ]);

        $response->assertRedirect();
        $this->assertSame(5, $walkIn->fresh()->visitors);
    }

    public function test_sales_cannot_delete_a_walk_in()
    {
        $sales = User::factory()->create();
        $sales->assignRole('Sales');

        $walkIn = WalkIn::create(['village' => 'Box Hill', 'date' => '2026-05-05', 'visitors' => 1]);

        $response = $this->actingAs($sales)->delete(route('walk-ins.destroy', $walkIn));

        $response->assertRedirect();
        $this->assertDatabaseHas('walk_ins', ['id' => $walkIn->id]);
    }

    public function test_admin_can_delete_a_walk_in()
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin');

        $walkIn = WalkIn::create(['village' => 'Box Hill', 'date' => '2026-05-05', 'visitors' => 1]);

        $response = $this->actingAs($admin)->delete(route('walk-ins.destroy', $walkIn));

        $response->assertRedirect();
        $this->assertDatabaseMissing('walk_ins', ['id' => $walkIn->id]);
    }
}
