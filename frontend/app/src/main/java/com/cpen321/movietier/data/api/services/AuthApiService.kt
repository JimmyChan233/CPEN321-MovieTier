package com.cpen321.movietier.data.api.services

import com.cpen321.movietier.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface AuthApiService {

    @POST("auth/signin")
    suspend fun signIn(@Body request: LoginRequest): Response<LoginResponse>

    @POST("auth/signup")
    suspend fun signUp(@Body request: LoginRequest): Response<LoginResponse>

    @POST("auth/signout")
    suspend fun signOut(): Response<ApiResponse<Unit>>

    @DELETE("auth/account")
    suspend fun deleteAccount(): Response<ApiResponse<Unit>>
}
