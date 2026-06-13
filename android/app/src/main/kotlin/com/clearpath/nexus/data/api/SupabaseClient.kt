package com.clearpath.nexus.data.api

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.postgrest.Postgrest

/**
 * Singleton object that initializes and holds the instance of SupabaseClient
 * with Auth and Postgrest modules enabled.
 */
object SupabaseClient {
    private const val SUPABASE_URL = "https://faldktowgdddvtzydqqa.supabase.co"
    private const val SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhbGRrdG93Z2RkZHZ0enlkcXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjE1MzgsImV4cCI6MjA5NjczNzUzOH0.-ybKfEW5HmudPEwRQFnOXxzLGT197da6pSzHDKTCj9o"

    val client = createSupabaseClient(
        supabaseUrl = SUPABASE_URL,
        supabaseKey = SUPABASE_KEY
    ) {
        install(Auth)
        install(Postgrest)
    }
}
