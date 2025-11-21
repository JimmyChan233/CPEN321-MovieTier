package com.cpen321.movietier.core.util

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val laZone: ZoneId = ZoneId.of("America/Los_Angeles")
private val hhmmFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm").withZone(laZone)
private val dateTimeFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(laZone)

fun formatIsoToPstHhMm(isoInstant: String?): String {
    return try {
        if (isoInstant.isNullOrBlank()) return "--:--"
        val instant = Instant.parse(isoInstant)
        hhmmFormatter.format(instant)
    } catch (_: Exception) {
        "--:--"
    }
}

fun formatIsoToPstDateTime(isoInstant: String?): String {
    return try {
        if (isoInstant.isNullOrBlank()) return "--:--"
        val instant = Instant.parse(isoInstant)
        dateTimeFormatter.format(instant)
    } catch (_: Exception) {
        "--:--"
    }
}
