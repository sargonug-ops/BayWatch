package com.baywatch.app.ui.map

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.baywatch.app.data.ServiceLocator
import com.baywatch.app.data.model.MapState
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class MapUiState(
    val mapState: MapState? = null,
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
)

class MapViewModel : ViewModel() {
    private val repository = ServiceLocator.zoneRepository

    private val _uiState = MutableStateFlow(MapUiState())
    val uiState: StateFlow<MapUiState> = _uiState.asStateFlow()

    private var refreshJob: Job? = null

    fun startAutoRefresh() {
        if (refreshJob?.isActive == true) return
        refreshJob = viewModelScope.launch {
            while (isActive) {
                refresh()
                delay(REFRESH_INTERVAL_MS)
            }
        }
    }

    private suspend fun refresh() {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        try {
            val state = repository.fetchMapState()
            _uiState.update { it.copy(mapState = state, isLoading = false) }
        } catch (error: Exception) {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    errorMessage = error.message ?: "Failed to load map state",
                )
            }
        }
    }

    companion object {
        private const val REFRESH_INTERVAL_MS = 5 * 60 * 1000L
    }
}
