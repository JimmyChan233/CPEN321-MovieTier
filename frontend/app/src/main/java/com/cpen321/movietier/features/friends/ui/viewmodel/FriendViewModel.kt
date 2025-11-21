package com.cpen321.movietier.features.friends.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.movietier.core.network.SseClient
import com.cpen321.movietier.shared.models.Friend
import com.cpen321.movietier.shared.models.FriendRequest
import com.cpen321.movietier.shared.models.User
import com.cpen321.movietier.features.friends.data.repository.FriendRepository
import com.cpen321.movietier.features.friends.ui.state.FriendUiState
import com.cpen321.movietier.features.friends.ui.state.FriendRequestUi
import com.cpen321.movietier.features.friends.ui.state.UiEvent
import com.cpen321.movietier.shared.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class FriendViewModel @Inject constructor(
    private val friendRepository: FriendRepository,
    private val sseClient: SseClient
) : ViewModel() {

    private val _uiState = MutableStateFlow(FriendUiState())
    val uiState: StateFlow<FriendUiState> = _uiState.asStateFlow()

    private val _searchResults = MutableStateFlow<List<User>>(emptyList())
    val searchResults: StateFlow<List<User>> = _searchResults.asStateFlow()

    private val _events = MutableSharedFlow<UiEvent>()
    val events = _events

    init {
        loadFriends()
        loadRequests()
        loadOutgoingRequests()
        connectStream()
    }

    fun loadFriends() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            when (val result = friendRepository.getFriends()) {
                is Result.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        friends = result.data
                    )
                }
                is Result.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = result.message
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun searchUsers(query: String) {
        if (query.length < 2) {
            _searchResults.value = emptyList()
            return
        }
        viewModelScope.launch {
            when (val res = friendRepository.searchUsers(query)) {
                is Result.Success -> _searchResults.value = res.data
                is Result.Error -> _searchResults.value = emptyList()
                is Result.Loading -> {}
            }
        }
    }

    fun clearSearch() {
        _searchResults.value = emptyList()
    }

    fun loadRequests() {
        viewModelScope.launch {
            when (val result = friendRepository.getFriendRequestsDetailed()) {
                is Result.Success -> {
                    val enriched = result.data.map { fr ->
                        val user = fr.sender
                        FriendRequestUi(
                            id = fr.id,
                            senderId = user?.id ?: fr.senderId ?: "",
                            senderName = user?.name ?: "",
                            senderEmail = user?.email ?: "",
                            senderProfileImage = user?.profileImageUrl
                        )
                    }
                    _uiState.value = _uiState.value.copy(requests = enriched)
                }
                is Result.Error -> { /* ignore for now */ }
                is Result.Loading -> {}
            }
        }
    }

    fun sendFriendRequest(email: String) {
        viewModelScope.launch {
            when (val res = friendRepository.sendFriendRequest(email)) {
                is Result.Success -> {
                    _events.emit(UiEvent.Message("Friend request sent"))
                    clearSearch()
                    loadRequests()
                    loadOutgoingRequests()
                }
                is Result.Error -> { _events.emit(UiEvent.Message(res.message ?: "Failed to send request")) }
                is Result.Loading -> {}
            }
        }
    }

    fun removeFriend(friendId: String) {
        viewModelScope.launch {
            when (val res = friendRepository.removeFriend(friendId)) {
                is Result.Success -> { _events.emit(UiEvent.Message("Friend removed")); loadFriends() }
                is Result.Error -> { _events.emit(UiEvent.Message(res.message ?: "Failed to remove friend")) }
                is Result.Loading -> {}
            }
        }
    }

    fun respondToRequest(requestId: String, accept: Boolean) {
        viewModelScope.launch {
            when (val res = friendRepository.respondToFriendRequest(requestId, accept)) {
                is Result.Success -> {
                    _events.emit(UiEvent.Message(if (accept) "Friend request accepted" else "Friend request rejected"))
                    loadFriends(); loadRequests()
                }
                is Result.Error -> { _events.emit(UiEvent.Message(res.message ?: "Failed to respond")) }
                is Result.Loading -> {}
            }
        }
    }

    private fun connectStream() {
        sseClient.connect("friends/stream") { event, _ ->
            when (event) {
                "friend_request" -> { loadRequests(); viewModelScope.launch { _events.emit(UiEvent.Message("New friend request")) } }
                "friend_request_accepted" -> { loadFriends(); loadRequests(); loadOutgoingRequests(); viewModelScope.launch { _events.emit(UiEvent.Message("Friend request accepted")) } }
                "friend_request_rejected" -> { loadRequests(); loadOutgoingRequests(); viewModelScope.launch { _events.emit(UiEvent.Message("Friend request rejected")) } }
                "friend_removed" -> { loadFriends(); viewModelScope.launch { _events.emit(UiEvent.Message("Friend removed")) } }
                "friend_request_canceled" -> { loadRequests(); viewModelScope.launch { _events.emit(UiEvent.Message("Request canceled by sender")) } }
            }
        }
    }

    fun loadOutgoingRequests() {
        viewModelScope.launch {
            when (val result = friendRepository.getOutgoingFriendRequestsDetailed()) {
                is Result.Success -> {
                    val list = result.data.map { fr ->
                        val user = fr.receiver
                        FriendRequestUi(
                            id = fr.id,
                            senderId = fr.receiver?.id ?: fr.receiverId ?: "",
                            senderName = user?.name ?: "",
                            senderEmail = user?.email ?: "",
                            senderProfileImage = user?.profileImageUrl
                        )
                    }
                    _uiState.value = _uiState.value.copy(outgoingRequests = list)
                }
                else -> {}
            }
        }
    }

    fun cancelOutgoingRequest(requestId: String) {
        viewModelScope.launch {
            when (val res = friendRepository.cancelFriendRequest(requestId)) {
                is Result.Success -> {
                    _events.emit(UiEvent.Message("Friend request canceled"))
                    loadOutgoingRequests()
                }
                is Result.Error -> _events.emit(UiEvent.Message(res.message ?: "Failed to cancel request"))
                else -> {}
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        viewModelScope.launch { sseClient.closePath("friends/stream") }
    }
}
