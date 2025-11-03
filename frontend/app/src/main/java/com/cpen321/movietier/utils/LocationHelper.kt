package com.cpen321.movietier.utils

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import java.io.IOException
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull
import java.util.Locale
import kotlin.coroutines.resume

object LocationHelper {
    private const val DEFAULT_COUNTRY = "CA"
    private const val LOCATION_TIMEOUT_MS = 5000L

    /**
     * Get the user's country code from GPS location.
     * Falls back to CA if:
     * - Location permission not granted
     * - Location unavailable
     * - Geocoding fails
     * - Timeout occurs
     */
    suspend fun getCountryCode(context: Context): String {
        // Check permission
        if (!hasLocationPermission(context)) {
            return DEFAULT_COUNTRY
        }

        // Try to get country from GPS location with timeout
        return withTimeoutOrNull(LOCATION_TIMEOUT_MS) {
            try {
                getCountryFromLocation(context)
            } catch (e: IOException) {
                null
            }
        } ?: DEFAULT_COUNTRY
    }

    /**
     * Check if location permission is granted
     */
    fun hasLocationPermission(context: Context): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Get required location permissions
     */
    fun getLocationPermissions(): Array<String> {
        return arrayOf(
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.ACCESS_FINE_LOCATION
        )
    }

    @android.annotation.SuppressLint("MissingPermission")
    private suspend fun getCountryFromLocation(context: Context): String? {
        val fusedLocationClient: FusedLocationProviderClient =
            LocationServices.getFusedLocationProviderClient(context)

        // Try to get last known location first (faster)
        val lastLocation = try {
            fusedLocationClient.lastLocation.await()
        } catch (e: SecurityException) {
            null
        }

        val location = lastLocation ?: run {
            // If no last location, get current location
            try {
                val cancellationToken = CancellationTokenSource()
                fusedLocationClient.getCurrentLocation(
                    Priority.PRIORITY_BALANCED_POWER_ACCURACY,
                    cancellationToken.token
                ).await()
            } catch (e: IOException) {
                return null
            }
        }

        location ?: return null

        // Convert location to country code using Geocoder
        return getCountryFromCoordinates(context, location.latitude, location.longitude)
    }

    private suspend fun getCountryFromCoordinates(
        context: Context,
        latitude: Double,
        longitude: Double
    ): String? = suspendCancellableCoroutine { continuation ->
        try {
            val geocoder = Geocoder(context, Locale.getDefault())

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+ async API
                geocoder.getFromLocation(latitude, longitude, 1) { addresses ->
                    val countryCode = addresses.firstOrNull()?.countryCode
                    continuation.resume(countryCode)
                }
            } else {
                // Older API (deprecated but still works)
                @Suppress("DEPRECATION")
                val addresses = geocoder.getFromLocation(latitude, longitude, 1)
                val countryCode = addresses?.firstOrNull()?.countryCode
                continuation.resume(countryCode)
            }
        } catch (e: IOException) {
            continuation.resume(null)
        }
    }
}
