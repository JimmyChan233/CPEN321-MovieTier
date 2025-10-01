package com.cpen321.movietier.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.movietier.data.model.Friend
import com.cpen321.movietier.data.repository.FriendRepository
import com.cpen321.movietier.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FriendUiState(
    val isLoading: Boolean = false,
    val friends: List<Friend> = emptyList(),
    val errorMessage: String? = null
)

@HiltViewModel
class FriendViewModel @Inject constructor(
    private val friendRepository: FriendRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(FriendUiState())
    val uiState: StateFlow<FriendUiState> = _uiState.asStateFlow()

    init {
        loadFriends()
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

    fun sendFriendRequest(email: String) {
        viewModelScope.launch {
            when (friendRepository.sendFriendRequest(email)) {
                is Result.Success -> loadFriends()
                is Result.Error -> {}
                is Result.Loading -> {}
            }
        }
    }

    fun removeFriend(friendId: String) {
        viewModelScope.launch {
            when (friendRepository.removeFriend(friendId)) {
                is Result.Success -> loadFriends()
                is Result.Error -> {}
                is Result.Loading -> {}
            }
        }
    }
}
