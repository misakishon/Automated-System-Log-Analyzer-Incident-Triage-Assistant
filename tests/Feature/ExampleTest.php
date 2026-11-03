<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }

    public function test_read_log_endpoint_validates_path(): void
    {
        $response = $this->postJson('/api/read-log', ['path' => 'non_existent_file.log']);
        $response->assertStatus(404);

        $emptyResponse = $this->postJson('/api/read-log', ['path' => '']);
        $emptyResponse->assertStatus(400);
    }

    public function test_ollama_status_endpoint(): void
    {
        $response = $this->getJson('/api/ollama/status');
        // Since Ollama is running on this machine, it returns 200 with model information
        $this->assertContains($response->status(), [200, 502, 503]);
    }
}
