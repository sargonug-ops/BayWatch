package com.baywatch.app.data.remote

import com.baywatch.app.data.model.MapState
import retrofit2.http.GET

interface BayWatchApi {
    @GET("api/v1/state")
    suspend fun getMapState(): MapState
}
