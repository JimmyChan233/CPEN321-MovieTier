package com.cpen321.movietier.data.api

import com.cpen321.movietier.BuildConfig
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okio.BufferedSource
import java.nio.charset.Charset
import javax.inject.Inject
import javax.inject.Singleton
import java.util.concurrent.TimeUnit

@Singleton
class SseClient @Inject constructor(
    private val okHttpClient: OkHttpClient
){
    private var job: Job? = null
    @Volatile private var shouldRun: Boolean = false

    fun connect(path: String, onEvent: (String, String) -> Unit) {
        job?.cancel()
        shouldRun = true
        val handler = CoroutineExceptionHandler { _, _ -> /* swallow to avoid app crash */ }
        job = CoroutineScope(Dispatchers.IO + handler).launch {
            var backoff = 1000L
            while (isActive && shouldRun) {
                try {
                    val request = Request.Builder()
                        .url(BuildConfig.API_BASE_URL + path)
                        .header("Accept", "text/event-stream")
                        .build()
                    // Clone client with infinite read timeout for SSE
                    val sseClient = okHttpClient.newBuilder()
                        .readTimeout(0, TimeUnit.MILLISECONDS)
                        .build()
                    val call = sseClient.newCall(request)
                    val response = call.execute()
                    response.use { resp ->
                        if (!resp.isSuccessful) {
                            kotlinx.coroutines.delay(backoff)
                            backoff = (backoff * 2).coerceAtMost(30_000L)
                            return@use
                        }
                        backoff = 1000L // reset backoff on success

                        val body = resp.body ?: return@use
                        val source: BufferedSource = body.source()
                        var currentEvent = "message"
                        try {
                            while (isActive && shouldRun) {
                                val line = source.readUtf8Line() ?: break
                                if (line.startsWith("event:")) {
                                    currentEvent = line.removePrefix("event:").trim()
                                } else if (line.startsWith("data:")) {
                                    val data = line.removePrefix("data:").trim()
                                    onEvent(currentEvent, data)
                                }
                            }
                        } catch (_: Exception) {
                            // will reconnect via loop
                        }
                    }
                } catch (_: Exception) {
                    // Ignore and retry with backoff
                    kotlinx.coroutines.delay(backoff)
                    backoff = (backoff * 2).coerceAtMost(30_000L)
                }
            }
        }
    }

    suspend fun close() {
        shouldRun = false
        job?.cancelAndJoin()
        job = null
    }
}
