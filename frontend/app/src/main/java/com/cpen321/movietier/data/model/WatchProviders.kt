package com.cpen321.movietier.data.model

data class WatchProviders(
    val link: String?,
    val providers: ProviderGroups
)

data class ProviderGroups(
    val flatrate: List<String> = emptyList(),
    val rent: List<String> = emptyList(),
    val buy: List<String> = emptyList()
)

