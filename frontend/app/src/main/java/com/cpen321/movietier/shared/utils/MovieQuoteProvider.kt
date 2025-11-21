package com.cpen321.movietier.shared.utils

import java.util.Locale
import kotlin.math.abs

/**
 * Supplies short, punchy movie quotes without hitting external services.
 * Quotes are intentionally concise (mostly <= 50 chars) to avoid layout issues.
 * Quote data has been extracted to MovieQuotesData to reduce class size.
 */
object MovieQuoteProvider {

    private data class QuoteRecord(val title: String, val normalized: String, val quote: String)

    data class QuoteEntry(val title: String, val quote: String)

    private val quoteRecords = mutableListOf<QuoteRecord>()

    private val fallbackQuotes = listOf(
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

    private val quotesByTitle: Map<String, String> = buildQuotesMap()

    private fun buildQuotesMap(): Map<String, String> {
        val map = mutableMapOf<String, String>()

        fun addQuote(title: String, quote: String) {
            val normalized = normalize(title)
            if (!map.containsKey(normalized)) {
                quoteRecords.add(QuoteRecord(title = title, normalized = normalized, quote = quote))
                map[normalized] = quote
            }
        }

        // Populate all quotes from the data file
        MovieQuotesData.populateQuotes(::addQuote)

        return map
    }

    fun quoteCount(): Int = quoteRecords.size

    fun entryForIndex(index: Int): QuoteEntry {
        if (quoteRecords.isEmpty()) return QuoteEntry(title = "", quote = "")
        val size = quoteRecords.size
        val safeIndex = ((index % size) + size) % size
        val record = quoteRecords[safeIndex]
        return QuoteEntry(title = record.title, quote = record.quote)
    }

    fun matchesTitle(title: String, other: String): Boolean = normalize(title) == normalize(other)

    fun normalizedTitle(title: String): String = normalize(title)

    fun hasQuoteInDatabase(title: String): Boolean {
        val normalized = normalize(title)
        // Check exact match
        if (quotesByTitle.containsKey(normalized)) return true
        // Check fuzzy match for subtitles
        return quotesByTitle.keys.any { key ->
            normalized.contains(key) && key.length > 5
        }
    }

    fun getQuote(
        title: String,
        year: String? = null,
        rating: Double? = null,
        seed: Int? = null
    ): String {
        val normalized = normalize(title)
        quotesByTitle[normalized]?.let { return it }

        // Fuzzy match for subtitles (e.g., franchise entries)
        quotesByTitle.entries.firstOrNull { (key, _) ->
            normalized.contains(key) && key.length > 5
        }?.value?.let { return it }

        val dynamicPool = buildList {
            rating?.let {
                when {
                    it >= 8.5 -> add("Critics rave about this one.")
                    it >= 7.5 -> add("Audience approved entertainment.")
                }
            }
            year?.toIntOrNull()?.let { y ->
                add("$y standout.")
                val decade = "${(y / 10) * 10}s favorite."
                add(decade)
                if (y >= 2020) add("Fresh from the new wave.")
                if (y < 1990) add("Timeless cinema energy.")
            }
        }

        val pool = (dynamicPool + fallbackQuotes).ifEmpty { fallbackQuotes }
        val chosenSeed = seed ?: (title.hashCode())
        val index = abs(chosenSeed) % pool.size
        return pool[index]
    }

    private fun normalize(input: String): String {
        return input.lowercase(Locale.ROOT)
            .replace(Regex("[^a-z0-9 ]"), " ")
            .replace("\\s+".toRegex(), " ")
            .trim()
    }
}
