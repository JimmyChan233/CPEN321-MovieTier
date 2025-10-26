package com.cpen321.movietier.data.repository

import com.cpen321.movietier.data.api.ApiService
import com.cpen321.movietier.data.local.MovieQuoteProvider
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class QuoteRepository @Inject constructor(
    private val apiService: ApiService
) {
    // Cache for backend-fetched quotes to avoid repeated network calls
    private val apiQuoteCache = mutableMapOf<String, String>()

    private fun getCacheKey(title: String, year: String?): String {
        return "$title${year?.let { "::$it" } ?: ""}"
    }

    suspend fun getQuote(
        title: String,
        year: String? = null,
        rating: Double? = null
    ): Result<String> {
        // Step 1: Try hardcoded database first (instant response)
        val localQuote = MovieQuoteProvider.getQuote(title, year, rating)

        // Step 2: If we found a real quote (not a fallback), return it
        // A real quote will be more specific; fallback quotes are generic
        if (isRealQuote(localQuote)) {
            return Result.Success(localQuote)
        }

        // Step 3: Try backend API for better quote
        val cacheKey = getCacheKey(title, year)

        // Check if we've already fetched from API for this title
        apiQuoteCache[cacheKey]?.let { return Result.Success(it) }

        // Fetch from backend API
        return try {
            val response = apiService.getQuote(title, year)
            if (response.isSuccessful && response.body()?.success == true && !response.body()?.data.isNullOrBlank()) {
                val quote = response.body()!!.data!!
                apiQuoteCache[cacheKey] = quote
                Result.Success(quote)
            } else {
                // API failed or returned empty, fall back to local quote
                Result.Success(localQuote)
            }
        } catch (e: Exception) {
            // Network error, fall back to local quote
            Result.Success(localQuote)
        }
    }

    /**
     * Check if a quote is "real" (from the hardcoded database) vs a fallback.
     * Fallback quotes are mostly short generic phrases like "Cue the popcorn."
     * Real quotes tend to be longer or more specific.
     */
    private fun isRealQuote(quote: String): Boolean {
        // List of known fallback quotes from MovieQuoteProvider
        val fallbacks = setOf(
            "Cue the popcorn.",
            "Film night, sorted.",
            "Movie magic incoming.",
            "Lights, camera, relax.",
            "Stories worth the screen time.",
            "Scenes that stay with you.",
            "Rewind-worthy moments ahead.",
            "A prime pick for tonight.",
            "Big screen energy.",
            "Grab the best seat.",
            "Blockbuster mood.",
            "Fresh flick vibes.",
            "Time to press play.",
            "Film club favorite.",
            "Stay through the credits."
        )

        // If quote is not in fallback list, it's a real quote
        return !fallbacks.contains(quote)
    }
}
