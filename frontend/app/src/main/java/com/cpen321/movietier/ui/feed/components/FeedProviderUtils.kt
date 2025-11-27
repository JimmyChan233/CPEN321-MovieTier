package com.cpen321.movietier.ui.feed.components

/**
 * Utility functions for normalizing and ranking streaming provider names
 */

fun normalizeProviderName(name: String): String {
    val n = name.trim()
    val lower = n.lowercase()
    return when {
        lower.contains("netflix") -> "Netflix"
        lower.contains("amazon") || lower.contains("prime video") -> "Prime Video"
        lower.contains("disney") -> "Disney+"
        lower == "max" || lower.contains("hbo") -> "Max"
        lower.contains("apple tv") -> "Apple TV"
        lower.contains("hulu") -> "Hulu"
        lower.contains("paramount") -> "Paramount+"
        lower.contains("peacock") -> "Peacock"
        lower.contains("youtube") -> "YouTube"
        lower.contains("crunchyroll") -> "Crunchyroll"
        lower.contains("tubi") -> "Tubi"
        lower.contains("plex") -> "Plex"
        else -> n
    }
}

fun pickTopProviders(all: List<String>, limit: Int = 4): List<String> {
    val majors = listOf(
        "Netflix", "Prime Video", "Disney+", "Hulu", "Max",
        "Apple TV", "Paramount+", "Peacock", "YouTube", "Crunchyroll",
        "Tubi", "Plex"
    )
    val normalized = all.map { normalizeProviderName(it) }.distinct()
    val ranked = normalized.sortedBy { p -> majors.indexOf(p).let { if (it == -1) Int.MAX_VALUE else it } }
    val top = ranked.take(limit)
    return if (top.isNotEmpty()) top else normalized.take(limit)
}
