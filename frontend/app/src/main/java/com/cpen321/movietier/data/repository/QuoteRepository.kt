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
        // Step 1: Check if this title exists in the hardcoded database
        if (MovieQuoteProvider.hasQuoteInDatabase(title)) {
            val localQuote = MovieQuoteProvider.getQuote(title, year, rating)
            return Result.Success(localQuote)
        }

        // Step 2: Not in local database, try backend API for better quote
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
                val localQuote = MovieQuoteProvider.getQuote(title, year, rating)
                Result.Success(localQuote)
            }
        } catch (e: Exception) {
            // Network error, fall back to local quote
            val localQuote = MovieQuoteProvider.getQuote(title, year, rating)
            Result.Success(localQuote)
        }
    }
}
