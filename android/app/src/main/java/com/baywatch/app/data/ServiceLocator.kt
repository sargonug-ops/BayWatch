package com.baywatch.app.data

import android.content.Context
import com.baywatch.app.BuildConfig
import com.baywatch.app.data.remote.BayWatchApi
import com.baywatch.app.data.repository.ZoneRepository
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit

object ServiceLocator {
    private lateinit var appContext: Context

    val json: Json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    val zoneRepository: ZoneRepository by lazy {
        ZoneRepository(bayWatchApi, appContext)
    }

    private val bayWatchApi: BayWatchApi by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .build()

        Retrofit.Builder()
            .baseUrl(ensureTrailingSlash(BuildConfig.BAYWATCH_API_BASE_URL))
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(BayWatchApi::class.java)
    }

    fun init(context: Context) {
        appContext = context.applicationContext
    }

    private fun ensureTrailingSlash(url: String): String =
        if (url.endsWith("/")) url else "$url/"
}
