<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;

class TeamsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        //
        $team1 = User::factory()->create([
            'name' => 'Michael',
            'email' => 'michael@example.com',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        $team2 = User::factory()->create([
            'name' => 'Emilio',
            'email' => 'emilio@example.com',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        $team3 = User::factory()->create([
            'name' => 'Sarah',
            'email' => 'sarah@example.com',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        $team1->assignRole('Admin');
        $team2->assignRole('Admin');
        $team3->assignRole('Admin');
    }
}
