package com.cpen321.movietier.shared.utils

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.cpen321.movietier.shared.models.WatchProviders
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.first

private val Context.providersDataStore: DataStore<Preferences> by preferencesDataStore(name = "providers_cache")

@Singleton
class ProvidersCache @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val gson = com.google.gson.Gson()
    // Default TTL: 6 hours
    private val ttlMillis: Long = 6L * 60 * 60 * 1000

    private fun keyBase(movieId: Int, country: String) = "providers_${movieId}_${country}"

    private fun jsonKey(movieId: Int, country: String) = stringPreferencesKey(keyBase(movieId, country))
    private fun tsKey(movieId: Int, country: String) = longPreferencesKey(keyBase(movieId, country) + "_ts")

    suspend fun get(movieId: Int, country: String): WatchProviders? {
        val prefs = context.providersDataStore.data.first()
        val json = prefs[jsonKey(movieId, country)]
        val ts = prefs[tsKey(movieId, country)] ?: return null
        if (json.isNullOrBlank()) return null
        val age = System.currentTimeMillis() - ts
        if (age > ttlMillis) return null
        return try { gson.fromJson(json, WatchProviders::class.java) } catch (_: Exception) { null }
    }

    suspend fun put(movieId: Int, country: String, value: WatchProviders) {
        val now = System.currentTimeMillis()
        val json = gson.toJson(value)
        context.providersDataStore.edit { prefs ->
            prefs[jsonKey(movieId, country)] = json
            prefs[tsKey(movieId, country)] = now
        }
    }
}
